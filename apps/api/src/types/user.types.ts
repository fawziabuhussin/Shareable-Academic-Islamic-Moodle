/**
 * User-specific types and DTOs
 */

/**
 * DTO for creating a new user by admin
 */
export interface CreateUserDTO {
  firstName: string;
  fatherName: string;
  familyName: string;
  email: string;
  password: string;
  role: 'ADMIN' | 'TEACHER' | 'STUDENT';
  dateOfBirth: Date;
  phone: string;
  profession: string;
  gender: 'MALE' | 'FEMALE';
  idNumber: string;
  location: string;
}

/**
 * DTO for creating a new teacher
 */
export interface CreateTeacherDTO {
  firstName: string;
  fatherName: string;
  familyName: string;
  email: string;
  password: string;
  dateOfBirth: Date;
  phone: string;
  profession: string;
  gender: 'MALE' | 'FEMALE';
  idNumber: string;
  location: string;
}

/**
 * DTO for updating an existing user
 */
export interface UpdateUserDTO {
  firstName?: string;
  fatherName?: string;
  familyName?: string;
  email?: string;
  role?: 'ADMIN' | 'TEACHER' | 'STUDENT';
  blocked?: boolean;
  password?: string;
  dateOfBirth?: Date;
  phone?: string;
  profession?: string;
  gender?: 'MALE' | 'FEMALE';
  idNumber?: string;
  location?: string;
}

/**
 * User list filters for admin view
 */
export interface UserListFilters {
  search?: string;
  role?: string;
  gender?: string;
  blocked?: string;
  sortBy?: 'name' | 'role' | 'status' | 'gender' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * User with relations (includes related data)
 */
export interface UserWithRelations {
  id: string;
  name: string;
  firstName?: string | null;
  fatherName?: string | null;
  familyName?: string | null;
  email: string;
  role: string;
  blocked: boolean;
  profileComplete: boolean;
  dateOfBirth?: Date | null;
  phone?: string | null;
  profession?: string | null;
  gender?: string | null;
  idNumber?: string | null;
  location?: string | null;
  provider: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User list item (for admin user list)
 */
export interface UserListItem {
  id: string;
  name: string;
  firstName?: string | null;
  fatherName?: string | null;
  familyName?: string | null;
  email: string;
  role: string;
  blocked: boolean;
  profileComplete: boolean;
  dateOfBirth?: Date | null;
  phone?: string | null;
  profession?: string | null;
  gender?: string | null;
  idNumber?: string | null;
  location?: string | null;
  createdAt: Date;
  _count: {
    coursesTaught: number;
    enrollments: number;
  };
}

/**
 * User profile with full details
 */
export interface UserProfile {
  id: string;
  name: string;
  firstName?: string | null;
  fatherName?: string | null;
  familyName?: string | null;
  email: string;
  role: string;
  blocked: boolean;
  profileComplete: boolean;
  dateOfBirth?: Date | null;
  phone?: string | null;
  profession?: string | null;
  gender?: string | null;
  idNumber?: string | null;
  location?: string | null;
  provider: string | null;
  createdAt: Date;
  _count: {
    coursesTaught: number;
    enrollments: number;
    examAttempts: number;
    homeworkSubmissions: number;
  };
  enrollments: Array<{
    course: {
      id: string;
      title: string;
      coverImage: string | null;
    };
  }>;
  coursesTaught: Array<{
    id: string;
    title: string;
    coverImage: string | null;
    _count: {
      enrollments: number;
    };
  }>;
}
