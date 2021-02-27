import { AuthService } from './auth';

export class GooglePhotos {

  authService: AuthService;

  constructor(authService: AuthService) {
    this.authService = authService;
  }

  static photosApiReadOnlyScope() {
    return 'https://www.googleapis.com/auth/photoslibrary.readonly';
  }

}
