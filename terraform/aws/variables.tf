variable "project_id" {
  type    = string
}
variable "location" {
  type    = string
}
variable "zone" {
  type    = string
}
variable "machine_type" {
  type    = string
}
variable "public_key" {
  type    = string
}
variable "ssh_user" {
  type    = string
}
variable "name" {
  type    = string
}
variable "image" {
  type    = string
}
variable "ssh_subnets" {
  type    = list(string)
  default = ["0.0.0.0/0"]
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
