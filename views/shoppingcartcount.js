// shoppingCart.js

function calculateTotalCheckedItems(products) {
    let totalCheckedItems = 0;
    for (let i = 0; i < products.length; i++) {
      if (products[i].checked) {
        totalCheckedItems += products[i].product_quantity;
      }
    }
    return totalCheckedItems;
  }
  
  function calculateOverallPrice(products) {
    let overallPrice = 0;
    for (let i = 0; i < products.length; i++) {
      const quantity = products[i].product_quantity;
      const price = products[i].price;
      overallPrice += quantity * price;
    }
    return overallPrice.toFixed(2);
  }
  