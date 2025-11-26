# Checkout Testing Guide

## Quick Test (2 minutes)

### Test 1: $59 Tier - Direct Checkout
1. Open `index.html` in your browser
2. Immediately click **"ADD TO CART - $59"** button (don't scroll)
3. **Expected:** Redirect to SimpleSwap instantly (no popup)
4. ✓ **Success:** You see SimpleSwap exchange page
5. ✗ **Fail:** If popup appears or nothing happens

### Test 2: $19 Tier - Order Bump Flow
1. Refresh the page
2. Click **"SAVE 68% - PRE-ORDER $19"** button
3. **Expected:** Order bump popup appears
4. Click **"YES! Add Cardigan - $10"**
5. ✓ **Success:** Redirect to SimpleSwap for $29
6. **Alternative:** Click "No thanks" → Redirect for $19

### Test 3: Size Selection (Optional)
1. Refresh the page
2. Scroll down to size selector
3. Click a size (S, M, or L)
4. Click **"ADD TO CART - $59"**
5. ✓ **Success:** Still works with custom size

## Automated Test (1 minute)

1. Open `test-checkout-flow.html` in your browser
2. Check pool server status (should be "degraded" or "healthy")
3. Click **"Test $59 Tier (Primary)"** button
4. Verify you get a success message with exchange URL
5. Click **"Test $19 Tier (Pre-order)"** button
6. Verify you get a success message
7. Check logs section for detailed flow

## What Changed?

### Before Fix
```
User clicks button → Check size → ❌ BLOCKED → Scroll to size → Select size → 
Popup appears → Click popup → Finally checkout
```
**Result:** Many users abandoned due to friction

### After Fix
```
User clicks button → Auto-size M → ✓ Direct checkout → SimpleSwap
```
**Result:** Instant checkout, much better conversion

## Expected Behavior

### ✓ Working Correctly
- Clicking $59 button → Instant redirect (no popup)
- Clicking $19 button → Order bump popup appears
- No size selection required
- All redirects go to SimpleSwap
- Error messages if pool is unavailable

### ✗ Problems (Report if you see these)
- Button does nothing when clicked
- Popup appears for $59 tier (should not)
- No popup for $19 tier (should appear)
- Error: "Unable to create order"
- Redirect to wrong URL

## Troubleshooting

### Problem: Button does nothing
**Solution:** Check browser console (F12) for errors

### Problem: "Unable to create order"
**Cause:** Pool server may be down or out of wallets
**Solution:** Check pool status at: https://simpleswap-automation-1.onrender.com/health/pools

### Problem: Redirect not working
**Cause:** Browser may be blocking redirect
**Solution:** Check for popup blockers, try different browser

### Problem: CORS error in console
**Note:** This should NOT happen - if you see CORS errors, report immediately

## Testing Checklist

- [ ] $59 tier works without size selection
- [ ] $59 tier goes directly to checkout (no popup)
- [ ] $19 tier shows order bump popup
- [ ] Order bump "Accept" works ($29 total)
- [ ] Order bump "Decline" works ($19 total)
- [ ] All redirects go to SimpleSwap
- [ ] Error handling works when pool is unavailable
- [ ] Mobile view works correctly
- [ ] Desktop view works correctly

## Files to Check

- **Main:** `/Users/nelsonchan/Downloads/red cashmere final/index.html`
- **Test:** `/Users/nelsonchan/Downloads/red cashmere final/test-checkout-flow.html`
- **Backup:** `/Users/nelsonchan/Downloads/red cashmere final/index.html.backup-*`
- **Report:** `/Users/nelsonchan/Downloads/red cashmere final/output/agents/checkout-fix.json`
- **Summary:** `/Users/nelsonchan/Downloads/red cashmere final/output/agents/CHECKOUT-FIX-SUMMARY.md`

## Pool Server Status

**URL:** https://simpleswap-automation-1.onrender.com

**Current Status:**
- $19 pool: 2 wallets (low - replenishing)
- $29 pool: 1 wallet (low)
- $59 pool: 3 wallets (healthy)

**Note:** If pools run out, checkout will fail. Pool auto-replenishes.

## Need Help?

1. Check browser console (F12) for errors
2. Review `/output/agents/CHECKOUT-FIX-SUMMARY.md`
3. Test with `/test-checkout-flow.html` for detailed logs
4. Verify pool status is healthy

---

**Last Updated:** 2025-11-27  
**Fix Status:** ✓ COMPLETE  
**Testing Status:** Ready for QA
