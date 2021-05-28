variable "project_id" {}
variable "location" {}
variable "zone" {}
variable "machine_type" {
  default = "n1-standard-2"
}
variable "public_key" {}
variable "ssh_user" {}
variable "name" {}
variable "image" {
  default = "1804"
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
