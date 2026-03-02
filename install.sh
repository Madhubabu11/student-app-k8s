#!/bin/bash
sudo apt update

ARCH=$(uname -m)

if [ "$ARCH" = "x86_64" ]; then
  ARCH_TYPE="amd64"
elif [ "$ARCH" = "aarch64" ]; then
  ARCH_TYPE="arm64"
else
  echo "Unsupported architecture: $ARCH"
  exit 1
fi

# Install kind
curl -Lo kind https://kind.sigs.k8s.io/dl/v0.31.0/kind-linux-$ARCH_TYPE
chmod +x kind
sudo mv kind /usr/local/bin/

# Install kubectl
K8S_VERSION=$(curl -L -s https://dl.k8s.io/release/stable.txt)
curl -LO https://dl.k8s.io/release/${K8S_VERSION}/bin/linux/$ARCH_TYPE/kubectl
chmod +x kubectl
sudo mv kubectl /usr/local/bin/

# Verify
kind --version
kubectl version --client

sudo apt update
sudo apt install docker.io -y
sudo systemctl start docker
sudo usermod -aG docker ubuntu && newgrp docker
