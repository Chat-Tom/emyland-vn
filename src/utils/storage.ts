export interface UserAccount {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  password: string;
  registeredAt: string;
  lastLoginAt: string;
  isLoggedIn: boolean;
  rememberMe: boolean;
  isAdmin?: boolean;
}

export interface PropertyListing {
  id: string;
  title: string;
  description: string;
  price: number;
  area: number;
  propertyType: string;
  location: {
    province: string;
    district: string;
    ward: string;
    address: string;
  };
  contactInfo: {
    name: string;
    phone: string;
    email: string;
  };
  images: string[];
  userEmail: string;
  createdAt: string;
  updatedAt: string;
}

export class StorageManager {
  static readonly USERS_KEY = 'emyland_users';
  static readonly PROPERTIES_KEY = 'emyland_properties';
  static readonly CURRENT_USER_KEY = 'emyland_user';
  // Generate unique ID
  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Initialize admin account
  static initializeAdmin(): void {
    const adminEmail = 'chat301277@gmail.com';
    const existingAdmin = this.getUserByEmail(adminEmail);
    
    if (!existingAdmin) {
      const adminUser: UserAccount = {
        id: this.generateId(),
        email: adminEmail,
        password: 'Chat@1222',
        fullName: 'System Administrator',
        phone: '',
        registeredAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        isLoggedIn: false,
        rememberMe: false,
        isAdmin: true
      };
      
      this.saveUser(adminUser);
    }
  }
  // User management
  static saveUser(user: UserAccount): void {
    const users = this.getAllUsers();
    const existingIndex = users.findIndex(u => u.email === user.email);
    
    if (existingIndex >= 0) {
      users[existingIndex] = user;
    } else {
      users.push(user);
    }
    
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users));
  }

  static getAllUsers(): UserAccount[] {
    const users = localStorage.getItem(this.USERS_KEY);
    return users ? JSON.parse(users) : [];
  }

  static getUserByEmail(email: string): UserAccount | null {
    const users = this.getAllUsers();
    return users.find(u => u.email === email) || null;
  }

  static updateUser(user: UserAccount): void {
    this.saveUser(user);
  }

  static deleteUser(email: string): void {
    const users = this.getAllUsers();
    const filteredUsers = users.filter(u => u.email !== email);
    localStorage.setItem(this.USERS_KEY, JSON.stringify(filteredUsers));
    
    // Xóa tin đăng của user
    const properties = this.getAllProperties();
    const filteredProperties = properties.filter(p => p.userEmail !== email);
    localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(filteredProperties));
  }

  static getCurrentUser(): UserAccount | null {
    const userData = localStorage.getItem(this.CURRENT_USER_KEY);
    return userData ? JSON.parse(userData) : null;
  }

  static setCurrentUser(user: UserAccount): void {
    localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(user));
  }

  static clearCurrentUser(): void {
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }

  // Property management
  static saveProperty(property: PropertyListing): void {
    const properties = this.getAllProperties();
    const existingIndex = properties.findIndex(p => p.id === property.id);
    
    if (existingIndex >= 0) {
      properties[existingIndex] = property;
    } else {
      properties.push(property);
    }
    
    localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(properties));
  }

  static getAllProperties(): PropertyListing[] {
    const properties = localStorage.getItem(this.PROPERTIES_KEY);
    return properties ? JSON.parse(properties) : [];
  }

  static getUserProperties(userEmail: string): PropertyListing[] {
    const properties = this.getAllProperties();
    return properties.filter(p => p.userEmail === userEmail);
  }

  static getPropertyById(id: string): PropertyListing | null {
    const properties = this.getAllProperties();
    return properties.find(p => p.id === id) || null;
  }

  static deleteProperty(id: string): void {
    const properties = this.getAllProperties();
    const filteredProperties = properties.filter(p => p.id !== id);
    localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(filteredProperties));
  }

  // Authentication
  static login(email: string, password: string): UserAccount | null {
    const user = this.getUserByEmail(email);
    if (user && user.password === password) {
      user.isLoggedIn = true;
      this.saveUser(user);
      this.setCurrentUser(user);
      return user;
    }
    return null;
  }

  static logout(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      currentUser.isLoggedIn = false;
      this.saveUser(currentUser);
    }
    this.clearCurrentUser();
  }

  static register(userData: Omit<UserAccount, 'registeredAt' | 'lastLoginAt' | 'isLoggedIn'>): UserAccount | null {
    // Kiểm tra email đã tồn tại
    if (this.getUserByEmail(userData.email)) {
      return null;
    }

    const newUser: UserAccount = {
      ...userData,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      isLoggedIn: true
    };

    this.saveUser(newUser);
    this.setCurrentUser(newUser);
    return newUser;
  }

  // Utility methods
  static clearAllData(): void {
    localStorage.removeItem(this.USERS_KEY);
    localStorage.removeItem(this.PROPERTIES_KEY);
    localStorage.removeItem(this.CURRENT_USER_KEY);
  }

  static exportData(): string {
    return JSON.stringify({
      users: this.getAllUsers(),
      properties: this.getAllProperties(),
      currentUser: this.getCurrentUser()
    });
  }

  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.users) localStorage.setItem(this.USERS_KEY, JSON.stringify(data.users));
      if (data.properties) localStorage.setItem(this.PROPERTIES_KEY, JSON.stringify(data.properties));
      if (data.currentUser) localStorage.setItem(this.CURRENT_USER_KEY, JSON.stringify(data.currentUser));
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  }
}