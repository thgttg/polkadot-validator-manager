provider "aws" {
  profile = var.terraform_state_profile
  region = var.location
}
resource "aws_key_pair" "key-{{ name }}" {
  key_name = "{{ name }}"
  public_key = var.public_key
}
resource "aws_vpc" "main-{{ name }}" {
  cidr_block = "172.26.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support = true
  tags = {
    Name = "{{ name }}"
  }
}
resource "aws_subnet" "main-{{ name }}" {
  cidr_block = "${cidrsubnet(aws_vpc.main-{{ name }}.cidr_block, 3, 1)}"
  vpc_id = "${aws_vpc.main-{{ name }}.id}"
  availability_zone = var.zone
  map_public_ip_on_launch = true
}
resource "aws_internet_gateway" "main-{{ name }}" {
  vpc_id = "${aws_vpc.main-{{ name }}.id}"
  tags = {
    Name = "{{ name }}"
  }
}
resource "aws_route_table" "main-{{ name }}" {
  vpc_id = "${aws_vpc.main-{{ name }}.id}"
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = "${aws_internet_gateway.main-{{ name }}.id}"
  }
  tags = {
    Name = "{{ name }}"
  }
}
resource "aws_route_table_association" "main-{{ name }}" {
  subnet_id = "${aws_subnet.main-{{ name }}.id}"
  route_table_id = "${aws_route_table.main-{{ name }}.id}"
}
resource "aws_security_group" "main-{{ name }}" {
  name = "externalssh"
  vpc_id = "${aws_vpc.main-{{ name }}.id}"
}
resource "aws_security_group_rule" "externalssh-{{ name }}" {
  type = "ingress"
  from_port = 22
  to_port = 22
  protocol = "tcp"
  cidr_blocks = var.ssh_subnets
  security_group_id = "${aws_security_group.main-{{ name }}.id}"
}
resource "aws_security_group_rule" "p2p-{{ name }}" {
  type = "ingress"
  from_port = 30333
  to_port = 30333
  protocol = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
  security_group_id = "${aws_security_group.main-{{ name }}.id}"
}
resource "aws_security_group_rule" "p2p-proxy-{{ name }}" {
  type = "ingress"
  from_port = 80
  to_port = 80
  protocol = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
  security_group_id = "${aws_security_group.main-{{ name }}.id}"
}
resource "aws_security_group_rule" "vpn-{{ name }}" {
  type = "ingress"
  from_port = 51820
  to_port = 51820
  protocol = "udp"
  cidr_blocks = ["0.0.0.0/0"]
  security_group_id = "${aws_security_group.main-{{ name }}.id}"
}
resource "aws_security_group_rule" "node-exporter-{{ name }}" {
  type = "ingress"
  from_port = 9100
  to_port = 9100
  protocol = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
  security_group_id = "${aws_security_group.main-{{ name }}.id}"
}
resource "aws_security_group_rule" "node-metrics-{{ name }}" {
  type = "ingress"
  from_port = 9616
  to_port = 9616
  protocol = "tcp"
  cidr_blocks = ["0.0.0.0/0"]
  security_group_id = "${aws_security_group.main-{{ name }}.id}"
}
resource "aws_security_group_rule" "allow_all-{{ name }}" {
  type = "egress"
  from_port = 0
  to_port = 0
  protocol = "-1"
  cidr_blocks = ["0.0.0.0/0"]
  security_group_id = "${aws_security_group.main-{{ name }}.id}"
}
resource "aws_instance" "main-{{ name }}" {
  ami = var.image
  instance_type = var.machine_type
  key_name = "{{ name }}"
  subnet_id = "${aws_subnet.main-{{ name }}.id}"
  vpc_security_group_ids = ["${aws_security_group.main-{{ name }}.id}"]
  root_block_device {
    volume_size = 150
  }
  tags = {
    "Name" = var.hostname
    "Domain" = var.domain
    "cname" = var.cname
  }
  user_data = data.template_file.userdata.rendered
}
resource "aws_cloudwatch_log_group" "cloud_init_output" {
  name = "${var.cname}_cloud-init-output"
  retention_in_days = 30
}
resource "aws_cloudwatch_log_group" "letsencrypt" {
  name = "${var.cname}_letsencrypt"
  retention_in_days = 30
}
resource "aws_cloudwatch_log_group" "nginx_access" {
  name = "${var.cname}_nginx-access"
  retention_in_days = 30
}
resource "aws_cloudwatch_log_group" "nginx_error" {
  name = "${var.cname}_nginx-error"
  retention_in_days = 30
}
data "template_file" "userdata" {
  template = file("userdata.yml")
  vars = {
    hostname = var.hostname
    domain = var.domain
    cname = var.cname
    username = var.ssh_user
    location = var.location

    log_group_cloud_init_output = aws_cloudwatch_log_group.cloud_init_output.name
    log_group_letsencrypt = aws_cloudwatch_log_group.letsencrypt.name
    log_group_nginx_access = aws_cloudwatch_log_group.nginx_access.name
    log_group_nginx_error = aws_cloudwatch_log_group.nginx_error.name
  }
}
