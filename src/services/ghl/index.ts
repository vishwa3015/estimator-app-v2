
import { credentialsService } from './credentialsService';
import { usersService } from './usersService';
import { opportunitiesService } from './opportunities';
import { contactsService } from './contacts';
import { emailService } from './emailService';

export const ghlService = {
  ...credentialsService,
  ...usersService,
  ...opportunitiesService,
  ...contactsService,
  ...emailService,
  
  // Add direct method for getting contacts
  getContactById: async (credentials, contactId) => {
    return await usersService.getContactById(credentials, contactId);
  }
};
