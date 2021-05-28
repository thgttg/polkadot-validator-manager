const fs = require('fs-extra');
const path = require('path');

const cmd = require('../cmd');
const { Project } = require('../project');
const ssh = require('../ssh');
const tpl = require('../tpl');


class Terraform {
  constructor(cfg) {
    this.config = JSON.parse(JSON.stringify(cfg));

    const project = new Project(cfg);
    this.terraformOriginPath = path.join(__dirname, '..', '..', '..', 'terraform');
    this.terraformFilesPath = path.join(project.path(), 'terraform');

    this.options = {
      verbose: true
    };
  }

  async initNodes() {
    await this._initNodes('validator',this.config.validators.nodes)
    this.config.publicNodes && await this._initNodes('publicNode',this.config.publicNodes.nodes)
  }

  async sync(method='apply') {
    this._initializeTerraform();
    try {
      await this._initState();
    } catch(e) {
      console.log(`Allowed error creating state backend: ${e.message}`);
    }

    const sshKeys = ssh.keys();

    let validatorSyncPromises = [];
    try {
      validatorSyncPromises = await this._create('validator', sshKeys.validatorPublicKey, this.config.validators.nodes, method);
    } catch(e) {
      console.log(`Could not get validator sync promises: ${e.message}`);
    }

    let publicNodeSyncPromises = [];
    if(this.config.publicNodes){
      try {
        publicNodeSyncPromises = await this._create('publicNode', sshKeys.publicNodePublicKey, this.config.publicNodes.nodes, method);
      } catch(e) {
        console.log(`Could not get publicNodes sync promises: ${e.message}`);
      }
    }
    const syncPromises = validatorSyncPromises.concat(publicNodeSyncPromises)

    return Promise.all(syncPromises);
  }

  async clean() {
    console.log(`clean()`);
    this._initializeTerraform();
    let validatorCleanPromises = [];
    try {
      validatorCleanPromises = await this._destroy('validator',this.config.validators.nodes);
    } catch(e) {
      console.log(`Could not get validator clean promises: ${e.message}`);
    }

    let publicNodesCleanPromises = [];
    if(this.config.publicNodes){
      try {
        publicNodesCleanPromises = await this._destroy('publicNode', this.config.publicNodes.nodes);
      } catch(e) {
        console.log(`Could not get publicNodes clean promises: ${e.message}`);
      }
    }
    const cleanPromises = validatorCleanPromises.concat(publicNodesCleanPromises);

    return Promise.all(cleanPromises);
  }

  nodeOutput(type, counter, outputField, cname = undefined) {
    console.log(`nodeOutput(type = ${type}, counter = ${counter}, outputField = ${outputField})`);
    const cwd = this._terraformNodeDirPath(type, counter);
    const options = { cwd };
    //return this._cmd(`output -json ${outputField}`, options);
    return this._cmd([
        `-chdir=${cwd}`,
        'output',
        '-json',
        outputField,
      ].join(' '), options);
  }

  async _create(type, sshKey, nodes, method='apply') {
    console.log(`_create(type = ${type}, sshKey = ${sshKey}, nodes.length = ${nodes.length}, method = ${method})`);
    const createPromises = [];

    for (let i = 0; i < nodes.length; i++) {
      const cwd = this._terraformNodeDirPath(type, i);
      const nodeName = nodes[i].cname
        ? nodes[i].cname.split('.').join('-')
        : this._nodeName(type, i);
      createPromises.push(new Promise(async (resolve) => {
        const options = { cwd };
        await this._initCmd(options, `tfstate/${nodes[i].cname}`);
        this._createVarsFile(cwd, nodes[i], sshKey, nodeName);

        let cmd = (method === 'apply')
          ? [
              method,
              `-var=hostname=${nodes[i].hostname}`,
              `-var=domain=${nodes[i].domain}`,
              `-var=cname=${nodes[i].cname}`,
              `-var=image=${nodes[i].image}`,
              `-var=location=${nodes[i].location}`,
              `-var=machine_type=${nodes[i].machineType}`,
              `-var=cloudflare_email=${nodes[i].cloudflare.email}`,
              `-var=cloudflare_zone=${nodes[i].cloudflare.zone}`,
              `-var=terraform_state_location=${this.config.state.location}`,
              `-var=terraform_state_profile=${this.config.state.profile}`,
              /*
              `-var=terraform_state_key=tfstate/${nodes[i].cname}`,
              `-var=terraform_state_bucket=${this.config.state.bucket}`,
              `-var=terraform_state_table=${this.config.state.table}`,
              */
              '-auto-approve',
              '-lock=false'
            ].join(' ')
          : method;
        await this._cmd(cmd, options);
        resolve(true);
      }));
    }
    return createPromises;
  }

  async _destroy(type, nodes) {
    console.log(`_destroy(type = ${type}, nodes.length = ${nodes.length})`);
    const destroyPromises = [];

    for (let i = 0; i < nodes.length; i++) {
      const cwd = this._terraformNodeDirPath(type, i)
      destroyPromises.push(new Promise(async (resolve) => {
        const options = { cwd };
        await this._initCmd(options, `tfstate/${nodes[i].cname}`);
        await this._cmd('destroy -lock=false -auto-approve', options);

        resolve(true);
      }));
    }
    return destroyPromises;
  }

  async _cmd(command, options = {}) {
    console.log(`_cmd(command = ${command}, options = ${options})`);
    const actualOptions = Object.assign({}, this.options, options);
    return cmd.exec(`terraform ${command}`, actualOptions);
  }

  async _initCmd(options, stateKey = undefined) {
    console.log(`_initCmd(options = ${options}, stateKey = ${stateKey})`);
    await this._cmd([
        'init',
        `-var=terraform_state_bucket=${this.config.state.bucket}`,
        `-var=terraform_state_location=${this.config.state.location}`,
        `-var=terraform_state_profile=${this.config.state.profile}`,
        `-var=terraform_state_table=${this.config.state.table}`,
        `-backend-config="bucket=${this.config.state.bucket}"`,
        `-backend-config="key=${stateKey ?? this.config.state.key}"`,
        `-backend-config="region=${this.config.state.location}"`,
        `-backend-config="profile=${this.config.state.profile}"`,
        `-backend-config="encrypt=${this.config.state.encrypt}"`,
        `-backend-config="dynamodb_table=${this.config.state.table}"`
      ].join(' '), options);
  }

  async _initState(){
    console.log(`_initState()`)
    const cwd = this._terraformNodeDirPath('remote-state');
    const options = { cwd };
    await this._cmd([
        'init',
        `-var=terraform_state_bucket=${this.config.state.bucket}`,
        `-var=terraform_state_location=${this.config.state.location}`,
        `-var=terraform_state_profile=${this.config.state.profile}`,
        `-var=terraform_state_table=${this.config.state.table}`,
        `-backend-config="bucket=${this.config.state.bucket}"`,
        `-backend-config="key=${this.config.state.key}"`,
        `-backend-config="region=${this.config.state.location}"`,
        `-backend-config="profile=${this.config.state.profile}"`,
        `-backend-config="encrypt=${this.config.state.encrypt}"`,
        `-backend-config="dynamodb_table=${this.config.state.table}"`
      ].join(' '), options);
    return this._cmd([
        'apply',
        `-var=terraform_state_bucket=${this.config.state.bucket}`,
        `-var=terraform_state_location=${this.config.state.location}`,
        `-var=terraform_state_profile=${this.config.state.profile}`,
        `-var=terraform_state_table=${this.config.state.table}`,
        '-auto-approve'
      ].join(' '), options);
  }

  _createVarsFile(cwd, node, sshKey) {
    console.log(`_createVarsFile(cwd = ${cwd}, node = ${node}, sshKey = ${sshKey})`);
    const data = {
      terraform_state_bucket: this.config.state.bucket,
      terraform_state_location: this.config.state.location,
      terraform_state_profile: this.config.state.profile,
      terraform_state_table: this.config.state.table,
      cloudflare_email: node.cloudflare.email,
      cloudflare_zone: node.cloudflare.zone,
      publicKey: sshKey,
      sshUser: node.sshUser,
      machineType: node.machineType,
      location: node.location,
      zone: node.zone,
      projectId: node.projectId,
      hostname: node.hostname,
      domain: node.domain,
      cname: node.cname
    }

    if(node.image) {
      data.image = node.image;
    }

    const source = path.join(__dirname, '..', '..', '..', 'tpl', 'tfvars');
    const target = path.join(cwd, 'terraform.tfvars');

    tpl.create(source, target, data);
  }

  _initializeTerraform() {
    console.log('_initializeTerraform()')
    fs.removeSync(this.terraformFilesPath);
    fs.ensureDirSync(this.terraformFilesPath);

    this._copyTerraformFiles('remote-state', 0, 'remote-state');
    for (let counter = 0; counter < this.config.validators.nodes.length; counter++) {
      this._copyTerraformFiles(
        'validator',
        counter,
        this.config.validators.nodes[counter].provider,
        this.config.validators.nodes[counter].cname);
    }

    if (this.config.publicNodes){
      for (let counter = 0; counter < this.config.publicNodes.nodes.length; counter++) {
        this._copyTerraformFiles(
          'publicNode',
          counter,
          this.config.publicNodes.nodes[counter].provider,
          this.config.validators.nodes[counter].cname);
      }
    }
  }

  async _initNodes(type, nodes){
    console.log(`_initNodes(type = ${type}, nodes.length = ${nodes.length})`)
    for (let i = 0; i < nodes.length; i++) {
      const cwd = this._terraformNodeDirPath(type, i);
      const options = { cwd };
      await this._initCmd(options, `tfstate/${nodes[i].cname}`);
    }
  }

  _copyTerraformFiles(type, counter, provider, cname = undefined) {
    console.log(`_copyTerraformFiles(type = ${type}, counter = ${counter}, provider = ${provider})`)
    const targetDirPath = this._terraformNodeDirPath(type, counter);
    console.log(`targetDirPath = ${targetDirPath}`)
    const originDirPath = path.join(this.terraformOriginPath, provider);
    console.log(`originDirPath = ${originDirPath}`)
    fs.ensureDirSync(targetDirPath);

    const nodeName = cname
      ? cname.split('.').join('-')
      : this._nodeName(type, counter);
    const name = `${nodeName}-${this.config.project}`;

    fs.readdirSync(originDirPath).filter(x => x.endsWith('.tf') || x.endsWith('.yml')).forEach((item) => {
      const origin = path.join(originDirPath, item);
      const target = path.join(targetDirPath, item);
      const data = {
        name
      };
      tpl.create(origin, target, data);
    });
  }

  _terraformNodeDirPath(type, counter = 0, cname = undefined) {
    console.log(`_terraformNodeDirPath(type = ${type}, counter = ${counter})`)
    const dirName = cname
      ? cname.split('.').join('-')
      : this._nodeName(type, counter);
    return path.join(this.terraformFilesPath, dirName);
  }

  _nodeName(type, counter) {
    console.log(`_nodeName(type = ${type}, counter = ${counter})`)
    const name = `${type}${counter}`;
    return name.toLowerCase();
  }
}

module.exports = {
  Terraform
}
