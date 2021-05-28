variable "project_id" {}
variable "client_id" {}
variable "client_secret" {}
variable "location" {}
variable "zone" {}
variable "machine_type" {
  default = "Standard_D2s_v3"
}
variable "public_key" {}
variable "ssh_user" {}
variable "name" {}
variable "image" {
  default = "18.04-LTS"
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
