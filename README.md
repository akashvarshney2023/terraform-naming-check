# terraform-naming-check
This is a custom git action which is used to validate the terraform  naming of the resources as per standards

# Workflow 
 1. Read the infra directory from the repository and get the list of all the terraform files
 2. Read the tfvars file and check the name property of the resources and check if it follows the naming standards
 3. If it does not follow the standards, then the action will fail and the user will be notified
 4. If it follows the standards, then the action will pass and the user will be notified

# Naming Convention Model
> 1. The name of the resource should be in lowercase
> 2. The name of the each resource should be start with the type of resource (as per the abbrivations as per Micrsoft Azure)
> 3. The name of the resource should be in singular form
> 4. The name of the resource should be in the format of {resource_type-name-environment-instance_number}
> 5.  More to add .. for other resoruces which are not as per point 4 (Ex .. Storage Account)
