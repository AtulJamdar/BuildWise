# Admin Frontend - Step 3 Implementation Guide

## Overview
Complete admin panel frontend implementation for custom pricing management system. Built with modular, production-ready architecture following industry best practices.

## Files Created (25 total)

### 1. Service Layer
- **`src/services/adminApi.js`** (328 lines)
  - 8 API endpoints for admin operations
  - Centralized error handling
  - Full JSDoc documentation

### 2. State Management
- **`src/context/AdminContext.jsx`** (80 lines)
  - Global admin authentication state
  - Login/logout methods
  - Token verification on init

### 3. Custom Hooks (3 files)
- **`src/hooks/useAdminAuth.js`** - Admin auth context hook
- **`src/hooks/usePricingRequests.js`** - Pricing requests state management
- **`src/hooks/usePayments.js`** - Payments state management
- **`src/hooks/index.js`** - Centralized exports

### 4. Reusable Components (8 files)
- **`src/components/admin/Button.jsx`** - Variants: primary, secondary, danger, success, outline
- **`src/components/admin/Input.jsx`** - Text input with label and error
- **`src/components/admin/Card.jsx`** - Container component
- **`src/components/admin/Alert.jsx`** - Alert/notification component
- **`src/components/admin/AdminHeader.jsx`** - Top navigation bar
- **`src/components/admin/AdminSidebar.jsx`** - Left navigation
- **`src/components/admin/AdminLayout.jsx`** - Main layout wrapper
- **`src/components/admin/RequestCard.jsx`** - Pricing request display card
- **`src/components/admin/ProtectedRoute.jsx`** - Route authentication wrapper
- **`src/components/admin/index.js`** - Centralized exports

### 5. Pages (5 files)
- **`src/pages/AdminLogin.jsx`** (150 lines) - Admin authentication
- **`src/pages/AdminDashboard.jsx`** (180 lines) - Dashboard overview
- **`src/pages/PricingRequestsList.jsx`** (140 lines) - Requests list with filtering
- **`src/pages/RequestDetail.jsx`** (340 lines) - Request approval/rejection
- **`src/pages/PaymentTracker.jsx`** (230 lines) - Payment management

### 6. Utilities (4 files)
- **`src/utils/adminUtils.js`** (130 lines)
  - Format functions: currency, date, numbers
  - Status helpers: badges, labels
  - Text helpers: truncate, copy to clipboard
  
- **`src/utils/formValidation.js`** (60 lines)
  - Form validation: login, approval, rejection
  - Error field helpers
  
- **`src/utils/errorHandler.js`** (90 lines)
  - API error parsing
  - User-friendly messages
  - Retry logic
  
- **`src/utils/index.js`** - Centralized exports

### 7. Routing
- **`src/routes/AdminRoutes.jsx`** (70 lines)
  - All admin routes with ProtectedRoute wrapper
  - Login route (public)
  - Dashboard, Requests, Payments routes (protected)
  - 404 handling

## Integration Steps

### Step 1: Update Context Provider in Main App

In your `src/main.jsx` or root component:

```jsx
import { AdminProvider } from './context/AdminContext';

function App() {
  return (
    <AdminProvider>
      {/* Your other providers */}
      <BrowserRouter>
        {/* routes */}
      </BrowserRouter>
    </AdminProvider>
  );
}
```

### Step 2: Update App.jsx Routing

In `src/App.jsx`, add admin routes:

```jsx
import { AdminRoutes } from './routes/AdminRoutes';

function App() {
  return (
    <Routes>
      {/* Existing routes */}
      <Route path="/admin/*" element={<AdminRoutes />} />
      {/* Other routes */}
    </Routes>
  );
}
```

### Step 3: Verify Environment Variables

Ensure these are set in `.env`:

```
VITE_API_URL=http://localhost:8000
VITE_RAZORPAY_KEY=your_razorpay_key
```

### Step 4: Install Dependencies (if needed)

```bash
npm install react-router-dom
```

## Architecture

### Component Hierarchy
```
AdminRoutes
├── AdminLogin (public)
└── ProtectedRoute
    ├── AdminLayout
    │   ├── AdminHeader
    │   ├── AdminSidebar
    │   └── [Page Content]
    │       ├── AdminDashboard
    │       ├── PricingRequestsList
    │       ├── RequestDetail
    │       └── PaymentTracker
```

### State Management Flow
```
AdminContext
├── Provides: admin, loading, error, login(), logout()
├── useAdminAuth Hook → Component
├── usePricingRequests Hook → Component
└── usePayments Hook → Component
```

### Service Layer
```
adminApi.js
├── getAuthHeaders() → JWT in headers
├── adminLogin(email, password)
├── getPricingRequests()
├── getPricingRequestById(id)
├── approvePricingRequest(id, data)
├── rejectPricingRequest(id, reason)
├── createRazorpayOrder(planId)
└── getPendingPayments()
```

## Key Features

### Authentication
- JWT token stored in localStorage
- Token verification on app init
- Auto-redirect to login if expired
- Secure logout with confirmation

### Pricing Requests Management
- View all pending requests
- Search and filter by status
- View detailed request information
- Approve with custom pricing/features
- Reject with reason
- Automatic email notifications (backend)

### Payment Tracking
- View pending payments with deadlines
- Create Razorpay payment links
- Track payment status
- View payment history

### UI/UX
- Responsive design (mobile-friendly)
- Loading states on all operations
- Error handling with user-friendly messages
- Confirmation modals for critical actions
- Success notifications
- Color-coded status badges

## Code Quality

### Patterns Used
- Small, focused components (max 200-300 lines)
- Utility functions for common tasks
- Custom hooks for state logic
- Centralized error handling
- JSDoc documentation on all functions
- Form validation helpers
- Loading and error states throughout

### Best Practices
- Separation of concerns
- DRY (Don't Repeat Yourself)
- Single responsibility principle
- Proper error boundaries
- Async/await with error handling
- Protected routes with auth check
- Environment-based configuration

## Customization

### Add New Status
In `utils/adminUtils.js`, update:
```javascript
export const getStatusBadgeClass = (status) => {
  const classes = {
    // Add new status here
    'your_status': 'bg-xxx-100 text-xxx-800 border-xxx-300',
  };
};
```

### Add New Feature
In `pages/RequestDetail.jsx`, update `FEATURE_OPTIONS`:
```javascript
const FEATURE_OPTIONS = [
  { id: 'new-feature', label: 'New Feature Name' },
];
```

### Styling
All components use Tailwind CSS with responsive design. Update colors in components directly or create a theme config.

## Testing Checklist

- [ ] Admin can login with valid credentials
- [ ] Token stored in localStorage
- [ ] Dashboard loads with stats
- [ ] Can view all pricing requests
- [ ] Can search/filter requests
- [ ] Can view request details
- [ ] Can approve request
- [ ] Can reject request
- [ ] Approval form validates
- [ ] Rejection form validates
- [ ] Can view pending payments
- [ ] Can create Razorpay order
- [ ] Payment link copied correctly
- [ ] Can logout
- [ ] Redirects to login when expired
- [ ] 404 page displays correctly

## Troubleshooting

### "useAdminAuth must be used within AdminProvider"
- Ensure AdminProvider wraps your app in main.jsx

### Token not persisting
- Check browser localStorage is enabled
- Verify token is being set in login

### API errors
- Check backend is running on correct port
- Verify VITE_API_URL environment variable
- Check network tab for actual error

### Routes not working
- Ensure react-router-dom is installed
- Verify AdminRoutes is imported in App.jsx
- Check Route paths match component paths

## Performance Considerations

- Components use React.memo where beneficial
- API calls only on mount/dependency change
- No unnecessary re-renders
- Efficient list rendering
- Lazy loading for large datasets (can be added)

## Security Notes

- JWT token in Authorization header
- Sensitive data not logged
- Password fields masked
- Secure logout clears storage
- Protected routes prevent unauthorized access
- Confirmation modals prevent accidental actions

## Next Steps (Phase 4)

1. Create customer-facing pricing request form
2. Add customer status tracker
3. Implement payment confirmation page
4. Create customer plan management dashboard

## Support

For issues or questions, check:
- [React Docs](https://react.dev)
- [React Router Docs](https://reactrouter.com)
- [Tailwind CSS Docs](https://tailwindcss.com)
