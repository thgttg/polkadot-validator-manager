terraform {
  required_version = ">= 0.12"
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "~> 3.42"
    }
  }
  backend "s3" {
    bucket = "thgttg"
    key = "tfstate"
    dynamodb_table = "state-lock"
    region = "us-east-1"
    encrypt = true
    profile = "thgttg"
  }
}
provider "aws" {
  profile = var.terraform_state_profile
  region = var.terraform_state_location
}
resource "aws_s3_bucket" "terraform_state" {
  bucket = var.terraform_state_bucket
  versioning {
    enabled = true
  }
  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm = "AES256"
      }
    }
  }
}
resource "aws_dynamodb_table" "state_lock" {
  name = var.terraform_state_table
  billing_mode = "PAY_PER_REQUEST"
  hash_key = "LockID"
  attribute {
    name = "LockID"
    type = "S"
  }
}