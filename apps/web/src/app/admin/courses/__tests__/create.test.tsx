import { render, screen } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import CreateCoursePage from '../create/page';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    back: jest.fn(),
  })),
}));

// Mock API
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(() => Promise.resolve({ data: [{ id: '1', title: 'Category 1' }] })),
    post: jest.fn(),
  },
}));

describe('CreateCoursePage', () => {
  it('renders the create course form', () => {
    render(<CreateCoursePage />);
    expect(screen.getByText('إنشاء دورة جديدة')).toBeInTheDocument();
  });

  it('shows playlist option at the bottom', () => {
    render(<CreateCoursePage />);
    const playlistSection = screen.getByText(/إنشاء من قائمة تشغيل YouTube/i);
    expect(playlistSection).toBeInTheDocument();
  });
});

