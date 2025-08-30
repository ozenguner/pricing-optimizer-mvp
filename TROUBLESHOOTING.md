# RateCardLab Troubleshooting Guide

## Empty Screen Issue - Solution Steps

If you're seeing an empty screen when running the app, follow these steps:

### 1. Check Server Status
```bash
# Navigate to server directory
cd server

# Install dependencies if not done
npm install

# Start the server
npm run dev
```
**Expected output:** `Server running on port 5000`

### 2. Check Client Status
```bash
# Navigate to client directory  
cd client

# Install dependencies if not done
npm install

# Start the client
npm run dev
```
**Expected output:** `Local: http://localhost:3000`

### 3. Verify Database
```bash
# In server directory
npx prisma generate
npx prisma db push
```

### 4. Check Browser Console
1. Open Developer Tools (F12)
2. Look for JavaScript errors in Console tab
3. Check Network tab for failed API requests

### 5. Authentication Check
The app requires authentication. If you see an empty screen:

1. **First-time users**: You'll be redirected to `/login`
2. **Returning users**: Check if your session expired

### 6. Debug Mode
The app includes a debug panel (top-right corner in development) that shows:
- Authentication status
- Current route
- User information
- Any errors

### Common Issues & Solutions

#### Issue: "Cannot read properties of undefined"
**Solution**: Clear browser localStorage and refresh
```javascript
// In browser console:
localStorage.clear()
location.reload()
```

#### Issue: API requests failing
**Solution**: Ensure server is running on port 5000
- Check `http://localhost:5000/health` returns `{"status":"OK"}`

#### Issue: Blank page after login
**Solution**: Check if user has proper permissions
- Verify database contains user data
- Check server logs for errors

#### Issue: Components not loading
**Solution**: This was likely caused by missing default exports, which have been fixed.

### Development Mode Features

1. **Debug Panel**: Shows real-time app state (top-right corner)
2. **Error Boundaries**: Catch component errors gracefully  
3. **Loading States**: All async operations show loading indicators
4. **Hot Reload**: Changes reflect immediately during development

### Production Checklist

Before deploying, ensure:
- [ ] Environment variables are set
- [ ] Database is properly configured
- [ ] All dependencies are installed
- [ ] Build process completes successfully
- [ ] API endpoints are accessible

### Performance Monitoring

The app includes several performance optimizations:
- **Lazy Loading**: Routes load on-demand
- **Pagination**: Large datasets are paginated
- **React.memo**: Prevents unnecessary re-renders
- **Database Indexing**: Optimized query performance

### Contact & Support

If issues persist:
1. Check browser console for specific error messages
2. Verify server logs for backend issues
3. Ensure all dependencies are properly installed
4. Try clearing browser cache and localStorage

### Quick Start Commands

```bash
# Full reset and restart
cd server && npm install && npx prisma generate && npx prisma db push && npm run dev

# In another terminal
cd client && npm install && npm run dev
```

This should resolve the empty screen issue and get the application running properly.