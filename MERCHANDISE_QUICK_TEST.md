# Merchandise Feature - Quick Test Guide

## 🚀 Quick Start (5 Minutes)

### 1. Start Both Servers

**Terminal 1 - Backend:**
```bash
cd SLIIT_choir_backend
npm start
```
✅ Should see: "🎵 SLIIT Choir Backend Server" on port 5000

**Terminal 2 - Frontend:**
```bash
cd SLIIT_choir_frontend
npm run dev
```
✅ Should see: Vite server running on port 5173

---

## 🧪 Testing Steps

### Test 1: Create Merchandise (Admin Only)

1. **Login as Admin**
   - Go to http://localhost:5173
   - Click "Members Login"
   - Use admin credentials

2. **Navigate to Merchandise Management**
   - Click "Members Portal"
   - Click "Merchandise" tab
   - Click "Manage Merchandise" button

3. **Add New Merchandise**
   - Click "Add Merchandise"
   - Fill in form:
     - Name: "Test T-Shirt"
     - Description: "Official test t-shirt"
     - Price: 1500
     - Category: "tshirt"
     - Sizes: Select S, M, L
     - Stock: 10
     - Status: "available"
     - Image: (optional or use: https://images.unsplash.com/photo-1618677603286-0ec56cb6e1b5?w=400)
   - Click "Create Merchandise"
   - ✅ Success message appears
   - ✅ Item appears in list

---

### Test 2: Place an Order (Member)

1. **Login as Regular Member**
   - Logout if logged in as admin
   - Login with member credentials

2. **Browse Merchandise**
   - Go to Members Portal → Merchandise tab
   - See the merchandise catalog

3. **Add to Cart**
   - Select a size (e.g., "M")
   - Click "Add to Cart"
   - Item appears in cart at bottom
   - Try adding another item

4. **Checkout**
   - Review cart items and total
   - Click "Proceed to Checkout"
   - Checkout modal opens

5. **Submit Order**
   - Enter payment receipt URL (use dummy URL for testing):
     ```
     https://example.com/receipt123.jpg
     ```
   - Click "Place Order"
   - ✅ Success message: "Order placed successfully!"
   - ✅ Redirected to merchandise page

6. **View Order History**
   - Scroll down to "My Orders" section
   - ✅ Your order appears with "Pending" status

---

### Test 3: Verify Order (Admin)

1. **Login as Admin**
   - Logout and login with admin credentials

2. **Go to Order Management**
   - Members Portal → Merchandise tab
   - Click "Manage Orders" button

3. **View Statistics**
   - ✅ See statistics cards:
     - Total Orders
     - Pending Orders
     - Confirmed Orders
     - Total Revenue

4. **View Order Details**
   - Click "View Details" on the pending order
   - ✅ See customer info, items, total, receipt link

5. **Confirm Order**
   - Click "Confirm Order" button in modal
   - Confirm the action
   - ✅ Success message
   - ✅ Order status changes to "Confirmed"

---

### Test 4: Decline Order (Admin)

1. **Have member create another order**
   - Follow Test 2 again with different items

2. **Go to Order Management (Admin)**
   - Members Portal → Merchandise → Manage Orders

3. **Decline Order**
   - Click "View Details" on pending order
   - In the modal, enter decline reason:
     ```
     Invalid payment receipt. Please provide a clearer image.
     ```
   - Click "Decline Order"
   - ✅ Success message
   - ✅ Order status changes to "Declined"

4. **Member Views Decline Reason**
   - Login as the member
   - Go to Merchandise tab
   - Scroll to "My Orders"
   - ✅ Order shows "Declined" badge
   - ✅ Decline reason is displayed in red box

---

### Test 5: Edit Merchandise (Admin)

1. **Login as Admin**
   - Members Portal → Merchandise → Manage Merchandise

2. **Edit Item**
   - Click "Edit" on any merchandise item
   - Change the price (e.g., from 1500 to 1800)
   - Click "Update Merchandise"
   - ✅ Success message
   - ✅ Changes reflected in list

---

### Test 6: Delete Merchandise (Admin)

1. **Still in Manage Merchandise**
   - Click "Delete" on a merchandise item
   - Confirm deletion
   - ✅ Success message
   - ✅ Item removed from list

---

### Test 7: Filter Orders (Admin)

1. **In Order Management**
   - Use "Status" dropdown → Select "Pending"
   - Click "Apply Filters"
   - ✅ Only pending orders shown

2. **Test Period Filter**
   - Use "Period" dropdown → Select "Last Week"
   - Click "Apply Filters"
   - ✅ Only orders from last week shown

---

## 🔧 API Testing (Optional)

### Using cURL or Postman

**1. Login to Get Token:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "studentId": "AD12345678",
    "password": "admin123"
  }'
```
Save the returned `token`.

**2. Create Merchandise:**
```bash
curl -X POST http://localhost:5000/api/merchandise \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "API Test Shirt",
    "description": "Created via API",
    "price": 2000,
    "sizes": ["M", "L", "XL"],
    "category": "tshirt",
    "status": "available"
  }'
```

**3. Get All Merchandise:**
```bash
curl http://localhost:5000/api/merchandise \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**4. Create Order:**
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "merchandiseId": "MERCHANDISE_ID_HERE",
        "size": "M",
        "quantity": 2
      }
    ],
    "receipt": "https://example.com/receipt.jpg"
  }'
```

**5. Get Order Statistics:**
```bash
curl http://localhost:5000/api/orders/stats/summary \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ No console errors in browser or terminal
2. ✅ Merchandise appears in catalog
3. ✅ Cart updates correctly
4. ✅ Orders create successfully
5. ✅ Admin can see all orders
6. ✅ Admin can confirm/decline orders
7. ✅ Members see order status changes
8. ✅ Decline reasons display properly
9. ✅ Statistics show correct counts
10. ✅ Filters work correctly

---

## 🐛 Troubleshooting

### Issue: "Not authorized" error
**Solution:** 
- Make sure you're logged in
- Check if token exists in localStorage
- Try logging out and back in

### Issue: Merchandise not appearing
**Solution:**
- Refresh the page
- Check MongoDB for merchandise documents
- Ensure status is "available"

### Issue: Can't create order
**Solution:**
- Make sure you selected a size
- Check if cart has items
- Provide valid receipt URL

### Issue: Backend not responding
**Solution:**
- Check if server is running on port 5000
- Look for errors in terminal
- Restart the server

### Issue: Frontend not updating
**Solution:**
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Check browser console for errors

---

## 📊 Test Data Examples

### Sample Merchandise Items
```javascript
{
  name: "Choir T-Shirt 2025",
  description: "Official navy blue choir t-shirt with gold logo",
  price: 1500,
  sizes: ["S", "M", "L", "XL"],
  category: "tshirt",
  status: "available"
}

{
  name: "Choir Hoodie",
  description: "Warm hoodie for cold practice sessions",
  price: 3500,
  sizes: ["M", "L", "XL", "XXL"],
  category: "hoodie",
  status: "available"
}

{
  name: "Choir Band",
  description: "Stylish wristband with choir logo",
  price: 500,
  sizes: ["One Size"],
  category: "band",
  status: "available"
}
```

### Sample Receipt URLs (for testing)
```
https://example.com/receipt123.jpg
https://drive.google.com/file/d/1234567890
https://i.imgur.com/abc123.png
```

---

## 🎯 Expected Results

### Statistics After Testing
- Total Orders: 2-3
- Pending Orders: 0-1
- Confirmed Orders: 1
- Declined Orders: 1
- Total Revenue: (sum of confirmed orders)

---

## 📝 Notes

- Use real image URLs for better visual testing
- Test with multiple items in cart
- Test with different roles (member vs admin)
- Try edge cases (empty cart, no size selected, etc.)
- Check mobile responsiveness

---

**Happy Testing! 🎉**

If all tests pass, the feature is ready for production deployment.
