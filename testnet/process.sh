#!/bin/bash
echo $PWD
for r in $(grep 'image: \${DOCKER_REGISTRY}' $PWD/testnet/docker-compose.yml | sed -e 's/^.*\///')
do
aws ecr create-repository --repository-name "$r"
done
cd $PWD/testnet;
docker-compose build