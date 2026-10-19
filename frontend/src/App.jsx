import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';

// Dashboard
import { Dashboard } from './pages/dashboard/Dashboard';

// Employees
import { EmployeeList } from './pages/employees/EmployeeList';
import { EmployeeForm } from './pages/employees/EmployeeForm';
import { EmployeeView } from './pages/employees/EmployeeView';

// Tasks
import { TaskList } from './pages/tasks/TaskList';
import { TaskForm } from './pages/tasks/TaskForm';
import { TaskView } from './pages/tasks/TaskView';

function App() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="app-shell">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />

              {/* Employees Routes */}
              <Route path="/employees" element={<EmployeeList />} />
              <Route path="/employees/new" element={<EmployeeForm />} />
              <Route path="/employees/:id" element={<EmployeeView />} />
              <Route path="/employees/:id/edit" element={<EmployeeForm />} />

              {/* Tasks Routes */}
              <Route path="/tasks" element={<TaskList />} />
              <Route path="/tasks/new" element={<TaskForm />} />
              <Route path="/tasks/:id" element={<TaskView />} />
              <Route path="/tasks/:id/edit" element={<TaskForm />} />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;
