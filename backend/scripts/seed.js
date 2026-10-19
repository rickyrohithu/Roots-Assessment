const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { Employee } = require('../models/Employee');
const { Task } = require('../models/Task');
const Counter = require('../models/Counter');

dotenv.config();

const employeesData = [
  {
    employeeId: 'EMP-001',
    fullName: 'Rahul Sharma',
    email: 'rahul.sharma@rootsmedia.com',
    phone: '+91 98765 43210',
    department: 'Development',
    role: 'Senior Full Stack Engineer',
    joiningDate: new Date('2023-01-15'),
    status: 'Active',
    skills: ['Node.js', 'React', 'MongoDB', 'AWS', 'Docker'],
  },
  {
    employeeId: 'EMP-002',
    fullName: 'Priya Patil',
    email: 'priya.patil@rootsmedia.com',
    phone: '+91 98234 56789',
    department: 'Design',
    role: 'Lead UI/UX Designer',
    joiningDate: new Date('2023-03-10'),
    status: 'Active',
    skills: ['Figma', 'Design Systems', 'User Research', 'Prototyping'],
  },
  {
    employeeId: 'EMP-003',
    fullName: 'Amit Joshi',
    email: 'amit.joshi@rootsmedia.com',
    phone: '+91 97654 32109',
    department: 'QA',
    role: 'Senior QA Automation Engineer',
    joiningDate: new Date('2023-05-20'),
    status: 'Active',
    skills: ['Cypress', 'Jest', 'API Testing', 'Postman'],
  },
  {
    employeeId: 'EMP-004',
    fullName: 'Sneha Kulkarni',
    email: 'sneha.kulkarni@rootsmedia.com',
    phone: '+91 96543 21098',
    department: 'Development',
    role: 'Backend Developer',
    joiningDate: new Date('2023-07-01'),
    status: 'Active',
    skills: ['Express', 'TypeScript', 'Redis', 'PostgreSQL'],
  },
  {
    employeeId: 'EMP-005',
    fullName: 'Rohan Deshmukh',
    email: 'rohan.deshmukh@rootsmedia.com',
    phone: '+91 95432 10987',
    department: 'Sales',
    role: 'Senior Account Executive',
    joiningDate: new Date('2023-08-15'),
    status: 'Active',
    skills: ['B2B Sales', 'CRM', 'Negotiation', 'Lead Gen'],
  },
  {
    employeeId: 'EMP-006',
    fullName: 'Vikram Malhotra',
    email: 'vikram.malhotra@rootsmedia.com',
    phone: '+91 94321 09876',
    department: 'HR',
    role: 'HR Business Partner',
    joiningDate: new Date('2022-11-01'),
    status: 'Inactive',
    skills: ['Recruitment', 'Employee Relations', 'Payroll'],
  },
  {
    employeeId: 'EMP-007',
    fullName: 'Ananya Roy',
    email: 'ananya.roy@rootsmedia.com',
    phone: '+91 93210 98765',
    department: 'Design',
    role: 'Visual & Graphic Designer',
    joiningDate: new Date('2024-01-10'),
    status: 'On Leave',
    skills: ['Illustrator', 'Photoshop', 'Brand Identity', 'AfterEffects'],
    leaveStart: new Date('2026-10-10'),
    leaveEnd: new Date('2026-10-25'),
  },
  {
    employeeId: 'EMP-008',
    fullName: 'Tanvi Shah',
    email: 'tanvi.shah@rootsmedia.com',
    phone: '+91 92109 87654',
    department: 'Development',
    role: 'Frontend Specialist',
    joiningDate: new Date('2024-02-01'),
    status: 'Active',
    skills: ['React', 'Next.js', 'CSS Modules', 'Tailwind'],
  },
  {
    employeeId: 'EMP-009',
    fullName: 'Karthik Iyer',
    email: 'karthik.iyer@rootsmedia.com',
    phone: '+91 91098 76543',
    department: 'QA',
    role: 'QA Engineer',
    joiningDate: new Date('2024-03-15'),
    status: 'Active',
    skills: ['Selenium', 'Jira', 'Regression Testing'],
  },
  {
    employeeId: 'EMP-010',
    fullName: 'Neha Verma',
    email: 'neha.verma@rootsmedia.com',
    phone: '+91 90987 65432',
    department: 'Sales',
    role: 'Sales Representative',
    joiningDate: new Date('2024-04-10'),
    status: 'Active',
    skills: ['Inbound Sales', 'Client Engagement'],
  },
  {
    employeeId: 'EMP-011',
    fullName: 'Meera Nambiar',
    email: 'meera.nambiar@rootsmedia.com',
    phone: '+91 89876 54321',
    department: 'HR',
    role: 'Talent Acquisition Specialist',
    joiningDate: new Date('2024-05-01'),
    status: 'Active',
    skills: ['Tech Sourcing', 'Interviewing', 'Onboarding'],
  },
  {
    employeeId: 'EMP-012',
    fullName: 'Rajesh Gupta',
    email: 'rajesh.gupta@rootsmedia.com',
    phone: '+91 88765 43210',
    department: 'Development',
    role: 'DevOps Architect',
    joiningDate: new Date('2022-06-15'),
    status: 'Inactive',
    skills: ['Kubernetes', 'Terraform', 'CI/CD', 'AWS'],
  },
];

const seedDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/roots_management';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB for seeding...');

    // Clear existing data
    await Employee.deleteMany({});
    await Task.deleteMany({});
    await Counter.deleteMany({});

    // Reset sequence counter
    await Counter.create({ _id: 'taskId', seq: 0 });

    // Insert employees
    const createdEmployees = await Employee.insertMany(employeesData);
    console.log(`✅ Seeded ${createdEmployees.length} employees`);

    // Map for easy employee lookup by ID
    const empMap = {};
    createdEmployees.forEach((emp) => {
      empMap[emp.employeeId] = emp;
    });

    const createSnapshot = (emp) => ({
      employeeId: emp.employeeId,
      fullName: emp.fullName,
      email: emp.email,
      department: emp.department,
      role: emp.role,
    });

    // Sample tasks
    // Rahul Sharma currently has 3 active tasks (TSK-001, TSK-005, TSK-006) - Max capacity!
    // Priya Patil has 1 active task (TSK-002) and 1 cancelled (TSK-004)
    // Amit Joshi has 1 completed task (TSK-003) and 1 active task (TSK-007)
    const rawTasks = [
      {
        taskId: 'TSK-001',
        title: 'Fix payment API bug',
        description: 'Resolve race condition causing 500 errors on Stripe checkout webhook callbacks.',
        assignedEmployee: empMap['EMP-001']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-001']),
        department: 'Development',
        priority: 'High',
        status: 'In Progress',
        startDate: new Date('2026-09-25'),
        dueDate: new Date('2026-10-05'), // Overdue!
        completedDate: null,
      },
      {
        taskId: 'TSK-002',
        title: 'Design login screen',
        description: 'Create high fidelity responsive designs for social login and 2FA authentication flow.',
        assignedEmployee: empMap['EMP-002']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-002']),
        department: 'Design',
        priority: 'Medium',
        status: 'In Progress',
        startDate: new Date('2026-10-01'),
        dueDate: new Date('2026-10-28'),
        completedDate: null,
      },
      {
        taskId: 'TSK-003',
        title: 'Write test cases',
        description: 'End-to-end Cypress test suite for employee onboarding flow.',
        assignedEmployee: empMap['EMP-003']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-003']),
        department: 'QA',
        priority: 'Low',
        status: 'Completed',
        startDate: new Date('2026-09-20'),
        dueDate: new Date('2026-10-02'),
        completedDate: new Date('2026-10-02'),
      },
      {
        taskId: 'TSK-004',
        title: 'Update landing page',
        description: 'Redesign hero section with interactive 3D elements and lead capture form.',
        assignedEmployee: empMap['EMP-002']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-002']),
        department: 'Design',
        priority: 'Critical',
        status: 'Cancelled',
        startDate: new Date('2026-10-02'),
        dueDate: new Date('2026-10-12'),
        completedDate: null,
      },
      {
        taskId: 'TSK-005',
        title: 'Setup CI pipeline',
        description: 'Configure GitHub Actions workflow for automated testing and linting checks.',
        assignedEmployee: empMap['EMP-001']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-001']),
        department: 'Development',
        priority: 'High',
        status: 'Todo',
        startDate: new Date('2026-10-15'),
        dueDate: new Date('2026-10-25'),
        completedDate: null,
      },
      {
        taskId: 'TSK-006',
        title: 'Optimize database queries',
        description: 'Add compound indices on tasks collection for department, priority, and date range filters.',
        assignedEmployee: empMap['EMP-001']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-001']),
        department: 'Development',
        priority: 'Critical',
        status: 'In Progress',
        startDate: new Date('2026-10-16'),
        dueDate: new Date('2026-10-29'),
        completedDate: null,
      },
      {
        taskId: 'TSK-007',
        title: 'Verify cross-browser compatibility',
        description: 'Run automated Playwright matrix tests on Safari, Firefox, and Chrome.',
        assignedEmployee: empMap['EMP-003']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-003']),
        department: 'QA',
        priority: 'Medium',
        status: 'Todo',
        startDate: new Date('2026-10-18'),
        dueDate: new Date('2026-10-31'),
        completedDate: null,
      },
      {
        taskId: 'TSK-008',
        title: 'Build user role management API',
        description: 'Implement RBAC middleware for admin, editor, and viewer roles.',
        assignedEmployee: empMap['EMP-004']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-004']),
        department: 'Development',
        priority: 'High',
        status: 'In Progress',
        startDate: new Date('2026-09-28'),
        dueDate: new Date('2026-10-08'), // Overdue!
        completedDate: null,
      },
      {
        taskId: 'TSK-009',
        title: 'Prepare quarterly sales presentation',
        description: 'Compile revenue pipeline and churn analytics for executive board meeting.',
        assignedEmployee: empMap['EMP-005']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-005']),
        department: 'Sales',
        priority: 'High',
        status: 'Todo',
        startDate: new Date('2026-10-19'),
        dueDate: new Date('2026-10-26'),
        completedDate: null,
      },
      {
        taskId: 'TSK-010',
        title: 'Revamp employee handbook',
        description: 'Update remote work policy, benefits breakdown, and code of conduct.',
        assignedEmployee: empMap['EMP-011']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-011']),
        department: 'HR',
        priority: 'Low',
        status: 'In Progress',
        startDate: new Date('2026-10-05'),
        dueDate: new Date('2026-10-24'),
        completedDate: null,
      },
      {
        taskId: 'TSK-011',
        title: 'Design icon system in Figma',
        description: 'Vector icon set for marketing website and web application dashboard.',
        assignedEmployee: empMap['EMP-002']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-002']),
        department: 'Design',
        priority: 'Medium',
        status: 'Todo',
        startDate: new Date('2026-10-19'),
        dueDate: new Date('2026-11-05'),
        completedDate: null,
      },
      {
        taskId: 'TSK-012',
        title: 'Implement Dark Mode Theme',
        description: 'Add CSS variables theme switcher with system preference detection.',
        assignedEmployee: empMap['EMP-008']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-008']),
        department: 'Development',
        priority: 'Medium',
        status: 'Completed',
        startDate: new Date('2026-09-15'),
        dueDate: new Date('2026-09-30'),
        completedDate: new Date('2026-09-29'),
      },
      {
        taskId: 'TSK-013',
        title: 'Security audit on auth endpoints',
        description: 'Audit JWT validation and rate limiting on /login and /refresh endpoints.',
        assignedEmployee: empMap['EMP-009']._id,
        employeeSnapshot: createSnapshot(empMap['EMP-009']),
        department: 'QA',
        priority: 'Critical',
        status: 'In Progress',
        startDate: new Date('2026-09-20'),
        dueDate: new Date('2026-10-04'), // Overdue!
        completedDate: null,
      },
    ];

    await Task.insertMany(rawTasks);
    await Counter.findByIdAndUpdate('taskId', { seq: rawTasks.length });
    console.log(`✅ Seeded ${rawTasks.length} tasks and updated Counter to ${rawTasks.length}`);

    console.log('🎉 Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();
