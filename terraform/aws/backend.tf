provider "aws" {
  profile = var.terraform_state_profile
  region = var.terraform_state_location
  alias = "backend"
}

terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 3.42"
    }
    cloudflare = {
      source = "cloudflare/cloudflare"
      version = "~> 2.21"
    }
  }
  backend "s3" {
    provider = aws.backend
  }
}
