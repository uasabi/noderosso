#! /bin/bash

ssh-keyscan -t rsa github.com >> /etc/ssh/ssh_known_hosts
