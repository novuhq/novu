export interface ICreateOrganizationDto {
  name: string;
  logo?: string;
  taxIdentifier?: string;
}

export interface IOrganizationDTO {
  _id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}
