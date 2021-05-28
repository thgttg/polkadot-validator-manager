variable "terraform_state_bucket" {
  type = string
  default = "thgttg"
}
variable "terraform_state_location" {
  type = string
  default = "us-east-1"
}
variable "terraform_state_profile" {
  type = string
  default = "thgttg"
}
variable "terraform_state_table" {
  type = string
  default = "state-lock"
}
