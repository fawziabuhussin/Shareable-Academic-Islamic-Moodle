/**
 * User Repository
 * Data access layer for User-related database operations
 */
import { prisma } from '../utils/prisma';
import { UserWithRelations, UserListItem, UserProfile, UserListFilters, CreateTeacherDTO, UpdateUserDTO } from '../types/user.types';
import { PaginationParams, PaginatedResponse } from '../types/common.types';

/**
 * Include configuration for user list (admin view)
 */
const userListSelect = {
  id: true,
  name: true,
  firstName: true,
  fatherName: true,
  familyName: true,
  email: true,
  role: true,
  blocked: true,
  profileComplete: true,
  dateOfBirth: true,
  phone: true,
  profession: true,
  gender: true,
  idNumber: true,
  location: true,
  createdAt: true,
  _count: {
    select: {
      coursesTaught: true,
      enrollments: true,
    },
  },
};

/**
 * Include configuration for user profile
 */
const userProfileSelect = {
  id: true,
  name: true,
  firstName: true,
  fatherName: true,
  familyName: true,
  email: true,
  role: true,
  blocked: true,
  profileComplete: true,
  dateOfBirth: true,
  phone: true,
  profession: true,
  gender: true,
  idNumber: true,
  location: true,
  provider: true,
  createdAt: true,
  _count: {
    select: {
      coursesTaught: true,
      enrollments: true,
      examAttempts: true,
      homeworkSubmissions: true,
    },
  },
  enrollments: {
    include: {
      course: {
        select: {
          id: true,
          title: true,
          coverImage: true,
        },
      },
    },
    take: 10,
    orderBy: { enrolledAt: 'desc' as const },
  },
  coursesTaught: {
    select: {
      id: true,
      title: true,
      coverImage: true,
      _count: {
        select: {
          enrollments: true,
        },
      },
    },
    take: 10,
  },
};

/**
 * Include configuration for simple user update/return
 */
const userSimpleSelect = {
  id: true,
  name: true,
  firstName: true,
  fatherName: true,
  familyName: true,
  email: true,
  role: true,
  blocked: true,
  profileComplete: true,
  dateOfBirth: true,
  phone: true,
  profession: true,
  gender: true,
  idNumber: true,
  location: true,
  provider: true,
  createdAt: true,
  updatedAt: true,
};

export class UserRepository {
  /**
   * Find all users with pagination (admin list view)
   */
  async findAll(filters?: UserListFilters, pagination?: PaginationParams): Promise<PaginatedResponse<UserListItem>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.role) {
      where.role = filters.role;
    }

    if (filters?.gender) {
      where.gender = filters.gender;
    }

    if (filters?.blocked !== undefined && filters?.blocked !== '') {
      where.blocked = filters.blocked === 'true';
    }

    // Build orderBy
    const sortOrder = filters?.sortOrder || 'desc';
    let orderBy: any = { createdAt: sortOrder };

    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'name':
          orderBy = { name: sortOrder };
          break;
        case 'role':
          orderBy = { role: sortOrder };
          break;
        case 'status':
          orderBy = { blocked: sortOrder };
          break;
        case 'gender':
          orderBy = { gender: sortOrder };
          break;
        case 'createdAt':
        default:
          orderBy = { createdAt: sortOrder };
          break;
      }
    }

    const [total, data] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: userListSelect,
        orderBy,
        skip,
        take: limit,
      }),
    ]);

    return {
      data: data as UserListItem[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find all users without pagination (backward compatible)
   */
  async findAllUnpaginated(): Promise<UserListItem[]> {
    return prisma.user.findMany({
      select: userListSelect,
      orderBy: { createdAt: 'desc' },
    }) as Promise<UserListItem[]>;
  }

  /**
   * Find a user by ID (simple)
   */
  async findById(id: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({
      where: { id },
      select: userSimpleSelect,
    }) as Promise<UserWithRelations | null>;
  }

  /**
   * Find a user by email
   */
  async findByEmail(email: string): Promise<UserWithRelations | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: userSimpleSelect,
    }) as Promise<UserWithRelations | null>;
  }

  /**
   * Find user profile by ID (detailed view)
   */
  async findProfileById(id: string): Promise<UserProfile | null> {
    return prisma.user.findUnique({
      where: { id },
      select: userProfileSelect,
    }) as Promise<UserProfile | null>;
  }

  /**
   * Create a new user with all profile fields
   */
  async createUser(data: {
    name: string;
    firstName: string;
    fatherName: string;
    familyName: string;
    email: string;
    role: string;
    passwordHash: string;
    dateOfBirth?: Date;
    phone?: string;
    profession?: string;
    gender?: string;
    idNumber?: string;
    location?: string;
    profileComplete?: boolean;
  }): Promise<UserWithRelations> {
    return prisma.user.create({
      data: {
        name: data.name,
        firstName: data.firstName,
        fatherName: data.fatherName,
        familyName: data.familyName,
        email: data.email,
        passwordHash: data.passwordHash,
        role: data.role,
        provider: 'EMAIL',
        dateOfBirth: data.dateOfBirth,
        phone: data.phone,
        profession: data.profession,
        gender: data.gender,
        idNumber: data.idNumber,
        location: data.location,
        profileComplete: data.profileComplete ?? true,
      },
      select: userSimpleSelect,
    }) as Promise<UserWithRelations>;
  }

  /**
   * Create a new teacher (legacy method - now uses createUser internally)
   */
  async createTeacher(data: CreateTeacherDTO, passwordHash: string): Promise<UserWithRelations> {
    const name = `${data.firstName} ${data.fatherName} ${data.familyName}`;
    return prisma.user.create({
      data: {
        name,
        firstName: data.firstName,
        fatherName: data.fatherName,
        familyName: data.familyName,
        email: data.email,
        passwordHash,
        role: 'TEACHER',
        provider: 'EMAIL',
        dateOfBirth: data.dateOfBirth,
        phone: data.phone,
        profession: data.profession,
        gender: data.gender,
        idNumber: data.idNumber,
        profileComplete: true,
      },
      select: userSimpleSelect,
    }) as Promise<UserWithRelations>;
  }

  /**
   * Update an existing user
   */
  async update(id: string, data: UpdateUserDTO & { name?: string }, passwordHash?: string): Promise<UserWithRelations> {
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.firstName !== undefined) updateData.firstName = data.firstName;
    if (data.fatherName !== undefined) updateData.fatherName = data.fatherName;
    if (data.familyName !== undefined) updateData.familyName = data.familyName;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.blocked !== undefined) updateData.blocked = data.blocked;
    if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.profession !== undefined) updateData.profession = data.profession;
    if (data.gender !== undefined) updateData.gender = data.gender;
    if (data.idNumber !== undefined) updateData.idNumber = data.idNumber;
    if (data.location !== undefined) updateData.location = data.location;
    if (passwordHash !== undefined) updateData.passwordHash = passwordHash;

    return prisma.user.update({
      where: { id },
      data: updateData,
      select: userSimpleSelect,
    }) as Promise<UserWithRelations>;
  }

  /**
   * Delete a user
   */
  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  /**
   * Check if user exists by ID
   */
  async existsById(id: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });
    return !!user;
  }

  /**
   * Search students by name, email, or idNumber
   */
  async searchStudents(query: string, limit: number = 20) {
    return prisma.user.findMany({
      where: {
        role: 'STUDENT',
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { idNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        idNumber: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Search students excluding those already enrolled in a specific course.
   * When query is null/empty, returns default suggestions (newest students first).
   */
  async searchStudentsExcludingCourse(courseId: string, query?: string | null, limit: number = 20) {
    const baseWhere: any = {
      role: 'STUDENT',
      NOT: {
        enrollments: {
          some: { courseId },
        },
      },
    };

    if (query && query.trim().length >= 2) {
      baseWhere.OR = [
        { name: { contains: query.trim(), mode: 'insensitive' } },
        { email: { contains: query.trim(), mode: 'insensitive' } },
        { idNumber: { contains: query.trim(), mode: 'insensitive' } },
      ];
    }

    return prisma.user.findMany({
      where: baseWhere,
      select: {
        id: true,
        name: true,
        email: true,
        idNumber: true,
      },
      take: limit,
      orderBy: query && query.trim().length >= 2
        ? { name: 'asc' as const }
        : { createdAt: 'desc' as const },
    });
  }

  /**
   * Find a user by ID including passwordHash (for password verification)
   */
  async findByIdWithPassword(id: string): Promise<{ id: string; passwordHash: string | null; provider: string | null } | null> {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, passwordHash: true, provider: true },
    });
  }

  /**
   * Find users by roles (e.g., TEACHER, ADMIN)
   */
  async findByRoles(roles: string[]): Promise<{ id: string; name: string }[]> {
    return prisma.user.findMany({
      where: {
        role: { in: roles },
        blocked: false,
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}

/**
 * Singleton instance
 */
export const userRepository = new UserRepository();
