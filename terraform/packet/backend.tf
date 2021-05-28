provider "aws" {
  profile = "thgttg"
  region = "us-east-1"
}

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 3.42"
    }
  }
  backend "s3" {}
}