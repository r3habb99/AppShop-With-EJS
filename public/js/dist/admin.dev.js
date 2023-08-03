"use strict";

var deleteProduct = function deleteProduct(btn) {
  var prodId = btn.parentNode.querySelector("[name=productId]").value;
  var productElement = btn.closest("article");
  fetch("/admin/product/" + prodId, {
    method: "DELETE"
  }).then(function (result) {
    return result.json();
  }).then(function (data) {
    console.log(data);
    productElement.parentNode.removeChild(productElement);
  })["catch"](function (err) {
    return console.log(err);
  });
};