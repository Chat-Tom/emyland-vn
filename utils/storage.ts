// utils/storage.ts

// ====================== USER ===========================
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

  // Avatar (lưu bền trong localStorage dạng URL/Base64)
  avatarUrl?: string;

  // --- BỔ SUNG CHUẨN ĐỂ KHÔNG LỖI TYPE ---
  createdAt?: string; // Hỗ trợ Dashboard hiển thị ngày tạo (nếu có)
  updatedAt?: string; // Hỗ trợ cập nhật User (UserEditModal)
}

// ==================== PROPERTY =========================
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
    ownerVerified?: boolean; // BỔ SUNG: dùng khi cần xác minh chính chủ
  };
  images: string[];
  userEmail: string; // người đăng (giữ tương thích)
  createdAt: string;
  updatedAt: string;
}

// ==================== SESSION ==========================
export type ActiveSession = {
  userId: string;
  phone: string;
  deviceId: string;
  loggedInAt: string;
};

// ================== HELPERS (an toàn trình duyệt/SSR) ==
function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function lsGet(key: string): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* no-op */
  }
}

function lsRemove(key: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* no-op */
  }
}

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ================== MANAGER ============================
export class StorageManager {
  // data keys
  static readonly USERS_KEY = "emyland_users";
  static readonly PROPERTIES_KEY = "emyland_properties";
  static readonly CURRENT_USER_KEY = "emyland_user"; // giữ tương thích cũ
  static readonly ACTIVE_SESSION_KEY = "emyland_active_session"; // phiên cho auto-login
  static readonly USER_DEVICES_KEY = "emyland_user_devices"; // map: phone -> string[]

  // key prefix (tuỳ chọn) cho ảnh pháp lý sổ đỏ/HĐMB
  static readonly LEGAL_IMG_PREFIX = "emyland_legal_images:";

  // ============== Helpers (private) =====================
  private static loadUserDevices(): Record<string, string[]> {
    return safeParse<Record<string, string[]>>(lsGet(this.USER_DEVICES_KEY), {});
  }

  private static saveUserDevices(map: Record<string, string[]>) {
    lsSet(this.USER_DEVICES_KEY, JSON.stringify(map));
  }

  private static normalizePhone(s: string): string {
    return (s || "").trim();
  }

  static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  /** Phát tín hiệu khi danh sách TIN ĐĂNG thay đổi (SPA + đa tab) */
  private static notifyPropertiesChanged(): void {
    // đa tab (kích hoạt sự kiện storage)
    lsSet("emyland_properties_updated", String(Date.now()));
    // trong cùng tab (SPA)
    if (isBrowser()) {
      try {
        window.dispatchEvent(new CustomEvent("emyland:properties-changed"));
      } catch {
        /* no-op */
      }
    }
  }

  // ============== Bootstrap Admin ======================
  static initializeAdmin(): void {
    const adminEmail = "chat301277@gmail.com";
    const existingAdmin = this.getUserByEmail(adminEmail);

    if (!existingAdmin) {
      const now = new Date().toISOString();
      const adminUser: UserAccount = {
        id: this.generateId(),
        email: adminEmail,
        // ❗ theo yêu cầu kiểm tra: dùng đúng mật khẩu Chat@1221
        password: "Chat@1221",
        fullName: "System Administrator",
        phone: "",
        registeredAt: now,
        lastLoginAt: now,
        isLoggedIn: false,
        rememberMe: true,
        isAdmin: true,
        createdAt: now,
        updatedAt: now,
      };
      this.saveUser(adminUser);
    }
  }

  // ================== Users =============================
  static getAllUsers(): UserAccount[] {
    const raw = lsGet(this.USERS_KEY);
    return safeParse<UserAccount[]>(raw, []);
  }

  // ❗ Merge để không làm mất avatarUrl hay field khác khi cập nhật từng phần
  static saveUser(user: UserAccount): void {
    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.id === user.id || u.email === user.email);
    const now = new Date().toISOString();

    if (idx >= 0) {
      const prev = users[idx];
      users[idx] = {
        ...prev,
        ...user,
        avatarUrl: user.avatarUrl ?? prev.avatarUrl,
        updatedAt: now,
      };
    } else {
      users.push({
        ...user,
        createdAt: user.createdAt ?? now,
        updatedAt: user.updatedAt ?? now,
      });
    }

    lsSet(this.USERS_KEY, JSON.stringify(users));
  }

  static updateUser(user: UserAccount): void {
    this.saveUser(user);
  }

  static deleteUserByEmail(email: string): void {
    const users = this.getAllUsers().filter((u) => u.email !== email);
    lsSet(this.USERS_KEY, JSON.stringify(users));

    const properties = this.getAllProperties().filter((p) => p.userEmail !== email);
    lsSet(this.PROPERTIES_KEY, JSON.stringify(properties));

    this.notifyPropertiesChanged();
  }

  // Giữ tên cũ cho tương thích
  static deleteUser(email: string): void {
    this.deleteUserByEmail(email);
  }

  static getUserByEmail(email: string): UserAccount | null {
    const users = this.getAllUsers();
    return users.find((u) => u.email === email) || null;
  }

  static getUserByPhone(phone: string): UserAccount | null {
    const p = this.normalizePhone(phone);
    const users = this.getAllUsers();
    return users.find((u) => this.normalizePhone(u.phone) === p) || null;
  }

  static getUserById(id: string): UserAccount | null {
    const users = this.getAllUsers();
    return users.find((u) => u.id === id) || null;
  }

  // Cho phép cập nhật avatar và đồng bộ currentUser
  static updateUserAvatar(userId: string, avatarUrl: string): UserAccount | null {
    const users = this.getAllUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return null;

    const updated: UserAccount = {
      ...users[idx],
      avatarUrl,
      updatedAt: new Date().toISOString(),
    };

    users[idx] = updated;
    lsSet(this.USERS_KEY, JSON.stringify(users));

    const cur = this.getCurrentUser();
    if (cur && cur.id === userId) this.setCurrentUser(updated);

    return updated;
  }

  // ================= Properties =========================
  static saveProperty(property: PropertyListing): void {
    const list = this.getAllProperties();
    const idx = list.findIndex((p) => p.id === property.id);
    const now = new Date().toISOString();

    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        ...property,
        updatedAt: property.updatedAt ?? now,
      };
    } else {
      list.push({
        ...property,
        createdAt: property.createdAt ?? now,
        updatedAt: property.updatedAt ?? now,
      });
    }

    lsSet(this.PROPERTIES_KEY, JSON.stringify(list));
    this.notifyPropertiesChanged();
  }

  static getAllProperties(): PropertyListing[] {
    const raw = lsGet(this.PROPERTIES_KEY);
    const arr = safeParse<PropertyListing[]>(raw, []);
    // Sắp theo mới → cũ để trang chủ/tổng quan nhìn trực quan
    return [...arr].sort((a, b) => {
      const ta = new Date(a.createdAt || a.updatedAt || 0).getTime();
      const tb = new Date(b.createdAt || b.updatedAt || 0).getTime();
      return tb - ta;
    });
  }

  /**
   * Lấy tin của một người dùng. Để tương thích dữ liệu cũ,
   * chấp nhận truyền vào *email hoặc phone*:
   * - khớp userEmail (chuẩn)
   * - hoặc khớp contactInfo.phone (trường hợp cũ lưu theo số)
   */
  static getUserProperties(emailOrPhone: string): PropertyListing[] {
    const iden = (emailOrPhone || "").trim();
    const properties = this.getAllProperties();
    return properties.filter(
      (p) => p.userEmail === iden || p.contactInfo?.phone === iden
    );
  }

  static getPropertyById(id: string): PropertyListing | null {
    const properties = this.getAllProperties();
    return properties.find((p) => p.id === id) || null;
  }

  static deleteProperty(id: string): void {
    const properties = this.getAllProperties().filter((p) => p.id !== id);
    lsSet(this.PROPERTIES_KEY, JSON.stringify(properties));
    this.notifyPropertiesChanged();
  }

  // ======= ẢNH PHÁP LÝ (sổ đỏ/HĐMB) — tiện ích tuỳ chọn =======
  /** Lưu danh sách ảnh pháp lý theo propertyId (base64/url) */
  static saveLegalImages(propertyId: string, images: string[]): void {
    lsSet(this.LEGAL_IMG_PREFIX + propertyId, JSON.stringify(images ?? []));
  }
  /** Lấy danh sách ảnh pháp lý theo propertyId */
  static getLegalImages(propertyId: string): string[] {
    return safeParse<string[]>(lsGet(this.LEGAL_IMG_PREFIX + propertyId), []);
  }
  /** Xoá ảnh pháp lý theo propertyId */
  static clearLegalImages(propertyId: string): void {
    lsRemove(this.LEGAL_IMG_PREFIX + propertyId);
  }

  // =================== AUTH (email) =====================
  static login(email: string, password: string): UserAccount | null {
    const user = this.getUserByEmail(email);
    if (user && user.password === password) {
      user.isLoggedIn = true;
      user.rememberMe = true;
      user.lastLoginAt = new Date().toISOString();
      this.saveUser(user);
      this.setCurrentUser(user); // giữ tương thích
      return user;
    }
    return null;
  }

  // =================== AUTH (phone) =====================
  /** Xác thực theo số điện thoại (không ghi session) */
  static verifyUser(phone: string, password: string): UserAccount | null {
    const user = this.getUserByPhone(phone);
    if (user && user.password === password) return user;
    return null;
  }

  /** Đăng nhập theo số điện thoại (chỉ set trạng thái, KHÔNG bắt buộc deviceId) */
  static loginByPhone(phone: string, password: string): UserAccount | null {
    const user = this.verifyUser(phone, password);
    if (!user) return null;
    user.isLoggedIn = true;
    user.rememberMe = true;
    user.lastLoginAt = new Date().toISOString();
    this.saveUser(user);
    this.setCurrentUser(user); // giữ tương thích
    return user;
  }

  static logout(): void {
    const currentUser = this.getCurrentUser();
    if (currentUser) {
      currentUser.isLoggedIn = false;
      this.saveUser(currentUser);
    }
    this.clearCurrentUser();
    this.clearActiveSession();
  }

  // ============== Session & Device binding =============
  /** Lưu phiên đăng nhập hiện tại cho auto-login */
  static setActiveSession(s: ActiveSession) {
    lsSet(this.ACTIVE_SESSION_KEY, JSON.stringify(s));
  }

  static getActiveSession(): ActiveSession | null {
    return safeParse<ActiveSession | null>(lsGet(this.ACTIVE_SESSION_KEY), null);
  }

  static clearActiveSession() {
    lsRemove(this.ACTIVE_SESSION_KEY);
  }

  /** Ghi nhớ rằng thiết bị này đã được user (phone) đăng nhập thành công */
  static markDeviceForUser(phone: string, deviceId: string) {
    const map = this.loadUserDevices();
    const list = new Set(map[phone] ?? []);
    list.add(deviceId);
    map[phone] = Array.from(list);
    this.saveUserDevices(map);
  }

  /** Thiết bị có được ghi nhớ cho phone chưa? */
  static isDeviceRecognized(phone: string, deviceId: string): boolean {
    const map = this.loadUserDevices();
    return (map[phone] ?? []).includes(deviceId);
  }

  // ============== Current User (compat) ================
  // ❗ Merge current user để không mất avatarUrl khi những nơi khác setCurrentUser(user) thiếu field
  static setCurrentUser(user: UserAccount): void {
    const cur = safeParse<UserAccount | null>(lsGet(this.CURRENT_USER_KEY), null);
    const now = new Date().toISOString();

    const merged: UserAccount = cur
      ? {
          ...cur,
          ...user,
          avatarUrl: user.avatarUrl ?? cur.avatarUrl,
          updatedAt: now,
        }
      : { ...user, createdAt: user.createdAt ?? now, updatedAt: user.updatedAt ?? now };

    lsSet(this.CURRENT_USER_KEY, JSON.stringify(merged));
  }

  static getCurrentUser(): UserAccount | null {
    return safeParse<UserAccount | null>(lsGet(this.CURRENT_USER_KEY), null);
  }

  static clearCurrentUser(): void {
    lsRemove(this.CURRENT_USER_KEY);
  }

  // =================== Register ========================
  static register(
    userData: Omit<UserAccount, "registeredAt" | "lastLoginAt" | "isLoggedIn" | "rememberMe">
  ): UserAccount | null {
    // Chặn trùng email/phone
    if (this.getUserByEmail(userData.email) || this.getUserByPhone(userData.phone)) {
      return null;
    }

    const id = (userData as any).id ?? this.generateId();
    const now = new Date().toISOString();

    const newUser: UserAccount = {
      ...userData,
      id,
      registeredAt: now,
      lastLoginAt: now,
      isLoggedIn: true,
      rememberMe: true,
      createdAt: userData.createdAt ?? now,
      updatedAt: userData.updatedAt ?? now,
    };

    this.saveUser(newUser);
    this.setCurrentUser(newUser); // giữ tương thích
    return newUser;
  }

  // =================== Utilities =======================
  static clearAllData(): void {
    lsRemove(this.USERS_KEY);
    lsRemove(this.PROPERTIES_KEY);
    lsRemove(this.CURRENT_USER_KEY);
    lsRemove(this.ACTIVE_SESSION_KEY);
    lsRemove(this.USER_DEVICES_KEY);
  }

  static exportData(): string {
    return JSON.stringify({
      users: this.getAllUsers(),
      properties: this.getAllProperties(),
      currentUser: this.getCurrentUser(),
      activeSession: this.getActiveSession(),
      userDevices: this.loadUserDevices(),
    });
  }

  static importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      if (data.users) lsSet(this.USERS_KEY, JSON.stringify(data.users));
      if (data.properties) lsSet(this.PROPERTIES_KEY, JSON.stringify(data.properties));
      if (data.currentUser) lsSet(this.CURRENT_USER_KEY, JSON.stringify(data.currentUser));
      if (data.activeSession) lsSet(this.ACTIVE_SESSION_KEY, JSON.stringify(data.activeSession));
      if (data.userDevices) lsSet(this.USER_DEVICES_KEY, JSON.stringify(data.userDevices));
      return true;
    } catch (error) {
      console.error("Import failed:", error);
      return false;
    }
  }
}
