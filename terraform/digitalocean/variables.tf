variable "project_id" {}
variable "do_token" {}
variable "name" {}
variable "public_key" {}
variable "machine_type" {
  default = "s-1vcpu-2gb"
}
variable "ssh_user" {}
variable "location" {}
variable "image" {
  default = "ubuntu-18-04-x64"
}
variable "hostname" {
  type = string
}
variable "domain" {
  type = string
}
variable "cname" {
  type = string
}
variable "terraform_state_location" {
  type = string
}
variable "terraform_state_profile" {
  type = string
}
#variable "terraform_state_bucket" {
#  type = string
#}
#variable "terraform_state_table" {
#  type = string
#}