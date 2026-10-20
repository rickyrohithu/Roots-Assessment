# Roots Media Marketing — Employee & Task Management System (MERN)

A robust, enterprise-grade Employee & Task Management application built with **React**, **Node.js**, **Express**, and **MongoDB (Mongoose)**, engineered to strictly enforce domain business rules on the backend and provide a modern, responsive user experience matching the technical assignment design specifications.

---

## 🚀 Live Demo & Deployment

| | URL |
|---|---|
| 🌐 **Frontend (Vercel)** | [https://roots-assessment-pyvucjr55-rickyrohithus-projects.vercel.app](https://roots-assessment-pyvucjr55-rickyrohithus-projects.vercel.app) |
| ⚙️ **Backend API (Render)** | [https://roots-assessment.onrender.com](https://roots-assessment.onrender.com) |
| 📂 **GitHub Repository** | [https://github.com/rickyrohithu/Roots-Assessment](https://github.com/rickyrohithu/Roots-Assessment) |

> **Note**: The Render backend may take ~30 seconds to wake up on the first request (free tier cold start).

---

## 📌 Table of Contents
1. [Key Features & Design Implementation](#-key-features--design-implementation)
2. [Business Rules Enforced on Backend](#-business-rules-enforced-on-backend)
3. [Required Technical Answers (Assignment Questions)](#-required-technical-answers)
4. [Tech Stack](#-tech-stack)
5. [Database Schema & Relationships](#-database-schema--relationships)
6. [API Overview & Endpoints](#-api-overview--endpoints)
7. [Local Setup & Installation](#-local-setup--installation)
8. [Environment Variables](#-environment-variables)
9. [Employee Deletion & Historical Integrity](#-employee-deletion--historical-integrity)
10. [Assumptions](#-assumptions)

---

## ✨ Key Features & Design Implementation

- **Interactive Dashboard**:
  - Live metric counters for **Total Employees** (`Active`, `Inactive`, `On Leave`) and **Total Tasks** (`Todo`, `In Progress`, `Completed`, `Cancelled`, `Overdue`).
  - **Employee Workload** tracking table showing real-time active task counts per employee with visual capacity meters (0 to 3 max limit).
  - Department distribution breakdown.
- **Task Management (`/tasks`)**:
  - Full server-side search (by task title or employee name).
  - Server-side multi-filtering: Department, Priority, Status, and Due Date range (`from` - `to`).
  - Server-side sorting: Created Date, Due Date, Priority by importance (`Critical` > `High` > `Medium` > `Low`), and Title.
  - **State Machine Status Dropdown**: In list and detail views, the status dropdown displays **only the valid next statuses** (`Todo → In Progress / Cancelled`, `In Progress → Completed / Cancelled`).
  - **Overdue Indicator**: Tasks past their due date that are not Completed or Cancelled automatically display `(Overdue)` in bold red across list, details, dashboard, and CSV exports.
  - **URL Parameter Synchronization**: Search query, filters, sorting, and pagination persist in the URL query string (e.g. `/tasks?status=In%20Progress&priority=High&page=2`).
  - **Full Dataset CSV Export**: The `Export To Csv` button streams all tasks matching current search and filter parameters (not merely the visible page).
- **Employee Management (`/employees`)**:
  - List view with pagination, search, department/status filters, and workload capacity meters.
  - Add / Edit employee with email normalization (`lowercase`, trimmed) and unique constraint checks.
  - Conditional Leave Date fields (`Leave Start` and `Leave End`) enforced whenever status is `On Leave`.
  - Comprehensive Employee Profile View showing contact details, skills tags, capacity status, active tasks, and historical task records.
- **Backend Error Presentation**:
  - When backend business rules are violated (e.g., assigning a 4th active task or assigning to an employee on leave), a clean red error banner matching the design mockup is rendered directly on the form.

---

## 🛡️ Business Rules Enforced on Backend

1. **Assignment Rules**:
   - Tasks can **only** be assigned to an **Active** employee.
   - Assignment to an **Inactive** employee is rejected (`HTTP 400`).
   - Assignment to an **On Leave** employee is rejected **only if** the task's `startDate` falls within the leave window (`leaveStart <= startDate <= leaveEnd`, both inclusive) (`HTTP 400`).
2. **Date Constraints**:
   - `dueDate` cannot be earlier than `startDate` (`HTTP 400`).
3. **Capacity Constraints**:
   - An employee can hold at most **3 active tasks** (`Todo` + `In Progress`) concurrently (`HTTP 400: "Employee already has 3 active tasks. Please choose another employee."`).
4. **Status Workflow & Immutability**:
   - New tasks start in `Todo` status.
   - Valid transitions: `Todo → In Progress`, `Todo → Cancelled`, `In Progress → Completed`, `In Progress → Cancelled`.
   - Any other transition is rejected (`HTTP 400`).
   - Status updates are strictly restricted to `PUT /api/tasks/:id/status`. General task updates (`PUT /api/tasks/:id`) are forbidden from altering task status.
   - Completed and Cancelled tasks are terminal and **cannot be edited** (`HTTP 400`).
5. **Completed Date Authority**:
   - `completedDate` is set exclusively by the backend timestamp when status transitions to `Completed`. Frontend input for this field is ignored/stripped.
6. **Overdue Calculation**:
   - Calculated dynamically on the server: `today > dueDate` AND `status NOT IN ('Completed', 'Cancelled')`.
7. **Safe Employee Deletion**:
   - Employees with active tasks (`Todo` or `In Progress`) **cannot be deleted** (`HTTP 400`).
   - Completed / Cancelled historical tasks retain full employee details via denormalized snapshot fields.

---

## 📝 Required Technical Answers

### 1. Where do you validate status transitions and why?
**Answer**:
Status transitions are validated **on the backend inside the dedicated `PUT /api/tasks/:id/status` controller and state machine utility (`backend/utils/businessRules.js`)**.
- **Why**: The backend is the single source of truth and authoritative enforcement boundary. Validating transitions only on the client allows malicious actors, API clients (Postman/cURL), or stale frontend tabs to bypass state constraints (e.g., resurrecting a `Completed` or `Cancelled` task back to `Todo`). Furthermore, separating status updates from the general `PUT /api/tasks/:id` endpoint prevents accidental status changes during title/description edits.

### 2. Why does Completed Date come from the backend?
**Answer**:
`completedDate` is timestamped exclusively by the backend server (`new Date()`) upon receiving a valid transition to `Completed`.
- **Why**: Client-side clocks are notoriously unreliable—users can have inaccurate system times, manipulated clocks, or different time zones. To guarantee audit trail integrity, consistent SLA reporting, and tamper-proof metrics, only the server can generate the authoritative completion timestamp.

### 3. How do you block inactive / on-leave assignment?
**Answer**:
In `backend/utils/businessRules.js` (`validateEmployeeAssignment`):
1. **Inactive**: Queries the employee record. If `employee.status === 'Inactive'`, it immediately rejects the request with `HTTP 400 ("Cannot assign task to an Inactive employee")`.
2. **On Leave**: Normalizes dates to midnight (`YYYY-MM-DD`). If `employee.status === 'On Leave'`, it evaluates whether `taskStartDate >= employee.leaveStart && taskStartDate <= employee.leaveEnd` (inclusive). If true, it returns `HTTP 400 ("Cannot assign task: [Name] is On Leave from [Start] to [End]")`. If the task starts outside the leave window, assignment is permitted.

### 4. Why are filtering and pagination on the backend?
**Answer**:
- **Scalability**: In real-world enterprise databases containing thousands or millions of tasks, sending the entire dataset to the client causes massive network latency, high memory consumption, and browser freezing.
- **Accuracy**: Server-side filtering and pagination ensure that counts (e.g., total matching records, total pages) and CSV exports evaluate the complete database state accurately without payload bloat.

### 5. Why do filters live in the URL?
**Answer**:
Filters and pagination state live in the URL query parameters (e.g., `/tasks?department=Development&status=In%20Progress&page=2`):
- **Deep Linking & Bookmarkability**: Users can bookmark or share direct links with colleagues and immediately see the exact same filtered view.
- **State Preservation on Refresh**: Page refreshes or browser Back/Forward navigation preserve the user's filtered context without state loss.
- **Browser History Support**: Users can intuitively use browser navigation buttons to step through their filter history.

### 6. What can go wrong if two requests assign a 4th active task at the same time?
**Answer**:
**The Problem (Race Condition / TOCTOU — Time-of-Check to Time-of-Use)**:
If an employee currently has 2 active tasks, and two separate requests to assign a task to that employee arrive simultaneously:
1. Request A counts active tasks: finds 2 (capacity check passes).
2. Request B counts active tasks before Request A finishes inserting: also finds 2 (capacity check passes).
3. Both Request A and Request B insert their tasks.
4. The employee now has **4 active tasks**, violating the 3-task maximum capacity invariant.

**How to Prevent / Solve this in Production**:
1. **MongoDB Transactions with Serializable/Snapshot Isolation**: Execute the capacity count and task creation within a multi-document session transaction (`mongoose.startSession()`).
2. **Atomic Counter / Optimistic Locking**: Maintain an `activeTaskCount` field on the `Employee` document and use an atomic conditional update:
   ```javascript
   Employee.findOneAndUpdate(
     { _id: employeeId, activeTaskCount: { $lt: 3 }, status: 'Active' },
     { $inc: { activeTaskCount: 1 } },
     { new: true }
   )
   ```
   If the update returns `null`, the capacity limit was reached or status changed concurrently, safely rejecting the second request without race conditions.

---

## 💻 Tech Stack

- **Frontend**: React 18, Vite, React Router v6, Lucide React icons, CSS3 / Custom Design System.
- **Backend**: Node.js, Express.js, Mongoose, Morgan, CORS, Dotenv.
- **Database**: MongoDB (indexes on `taskId`, `employeeId`, `email`, `department`, `priority`, `status`, `dueDate`).

---

## 🗄️ Database Schema & Relationships

### 1. Employee Schema (`Employee.js`)
```javascript
{
  employeeId: { type: String, required: true, unique: true, uppercase: true },
  fullName:   { type: String, required: true },
  email:      { type: String, required: true, unique: true, lowercase: true },
  phone:      { type: String, required: true },
  department: { type: String, enum: ['Development', 'Design', 'QA', 'HR', 'Sales'], required: true },
  role:       { type: String, required: true },
  joiningDate:{ type: Date, required: true },
  status:     { type: String, enum: ['Active', 'Inactive', 'On Leave'], default: 'Active' },
  skills:     [String],
  leaveStart: { type: Date }, // Required when status is 'On Leave'
  leaveEnd:   { type: Date }, // Required when status is 'On Leave'
  isDeleted:  { type: Boolean, default: false }
}
```

### 2. Task Schema (`Task.js`)
```javascript
{
  taskId:           { type: String, unique: true }, // Auto-generated e.g. TSK-001
  title:            { type: String, required: true },
  description:      { type: String, default: '' },
  assignedEmployee: { type: Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeSnapshot: {                             // Historical integrity snapshot
    employeeId: String,
    fullName: String,
    email: String,
    department: String,
    role: String
  },
  department:       { type: String, enum: ['Development', 'Design', 'QA', 'HR', 'Sales'], required: true },
  priority:         { type: String, enum: ['Low', 'Medium', 'High', 'Critical'], default: 'Medium' },
  status:           { type: String, enum: ['Todo', 'In Progress', 'Completed', 'Cancelled'], default: 'Todo' },
  startDate:        { type: Date, required: true },
  dueDate:          { type: Date, required: true },
  completedDate:    { type: Date, default: null } // Set ONLY by backend upon completion
}
```

### 3. Counter Schema (`Counter.js`)
Maintains an atomic sequence for generating task IDs sequentially (`TSK-001`, `TSK-002`, ...).

---

## 🔌 API Overview & Endpoints

### Employees API
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/employees` | Paginated employee list with search, department/status filters, and workload |
| `GET` | `/api/employees/options/assignable` | Returns active employee options with active task counts for task assignment |
| `GET` | `/api/employees/:id` | Single employee details, contact info, active tasks, and history |
| `POST` | `/api/employees` | Create employee (normalizes email, validates leave dates, checks duplicates) |
| `PUT` | `/api/employees/:id` | Update employee details |
| `DELETE` | `/api/employees/:id` | Delete employee (rejected if employee has active tasks) |

### Tasks API
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/tasks` | Paginated task list with search, department, priority, status, date range, sort |
| `GET` | `/api/tasks/export/csv` | Streams CSV export of all tasks matching current filters |
| `GET` | `/api/tasks/:id` | Get single task details and next valid statuses |
| `POST` | `/api/tasks` | Create task (enforces assignment eligibility, capacity <= 3, starts as Todo) |
| `PUT` | `/api/tasks/:id` | Update task details (locked for Completed/Cancelled; status change forbidden) |
| `PUT` | `/api/tasks/:id/status` | Update status (enforces state machine transitions, sets `completedDate`) |
| `DELETE` | `/api/tasks/:id` | Delete task |

### Dashboard API
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Returns employee metrics, task status counts, overdue count, and employee workload |

---

## ⚙️ Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- MongoDB running locally on `mongodb://127.0.0.1:27017` or a MongoDB Atlas URI.

### 1. Clone & Install Dependencies
```bash
# Clone the repository
git clone https://github.com/rickyrohithu/Roots-Assessment.git
cd Roots-Assessment

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Environment Setup
Create `.env` inside `backend/`:
```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/roots_management
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### 3. Seed Database
Populate realistic employees and tasks matching the assignment PDF:
```bash
cd backend
npm run seed
```

### 4. Run Locally
In terminal 1 (Backend):
```bash
cd backend
npm run dev
# Server starts on http://localhost:5001
```

In terminal 2 (Frontend):
```bash
cd frontend
npm run dev
# Vite starts on http://localhost:5173
```

Or from the root directory:
```bash
npm run dev:backend
npm run dev:frontend
```

---

## 🔒 Employee Deletion & Historical Integrity

The assignment requires:
> *"Delete employee: not allowed while the employee has Todo / In Progress tasks. Old tasks must still show meaningful employee details if the employee is later deleted."*

**Implementation**:
1. When `DELETE /api/employees/:id` is requested:
   - Backend checks: `Task.countDocuments({ assignedEmployee: id, status: { $in: ['Todo', 'In Progress'] } })`.
   - If count > 0, returns `HTTP 400: "Cannot delete employee: [Name] currently has X active task(s). Please reassign or complete these tasks first."`
2. When creating any task, the backend automatically embeds an immutable `employeeSnapshot`:
   ```javascript
   employeeSnapshot: {
     employeeId: employee.employeeId,
     fullName: employee.fullName,
     email: employee.email,
     department: employee.department,
     role: employee.role
   }
   ```
3. If an employee with only completed/cancelled tasks is deleted, queries fall back to `employeeSnapshot` so that reports, historical views, and CSV exports remain 100% complete and meaningful.

---

## 💡 Assumptions

1. **Departments**: Fixed set of 5 departments as specified (`Development`, `Design`, `QA`, `HR`, `Sales`).
2. **Priorities**: 4 levels (`Low`, `Medium`, `High`, `Critical`), with sorting importance order `Critical > High > Medium > Low`.
3. **No Authentication**: As stated in the prompt, login and authentication are omitted.
4. **Timezone Normalization**: Dates are evaluated using normalized midnight timestamps (`setHours(0,0,0,0)`) to eliminate UTC/local timezone boundary mismatches when verifying leave periods or due dates.
