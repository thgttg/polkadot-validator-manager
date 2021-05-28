variable "project_id" {}
variable "auth_token" {}
variable "location" {}
variable "zone" {}
variable "machine_type" {
  default = "t1.small.x86"
}
variable "public_key" {}
variable "ssh_user" {}
variable "name" {}
variable "image" {
  default = "ubuntu_18_04"
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
