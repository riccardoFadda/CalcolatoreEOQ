var eoq_form = document.getElementById("form");
var item_cost_checkbox = document.getElementById("item-cost-checkbox");
var discount_checkbox = document.getElementById("discount-checkbox");
var product_cost_fieldset = document.getElementById("item-cost-section-fieldset");
var discount_fieldset = document.getElementById("discount-section-fieldset");
var discount_tier_checkboxes = document.querySelectorAll("input[type=checkbox].discount-tier-checkbox");

var number_inputs = document.querySelectorAll("input[type=number]");

var instructions = document.getElementById("instructions");
var results_div = document.getElementById("results-div");

function evaluateEOQ(demand, setup_cost, holding_cost) {
  let eoq = Math.sqrt((2 * demand * setup_cost) / holding_cost);
  return Math.ceil(eoq);
}

function evaluatePeriodOrders(demand, order_quantity) {
  return Math.ceil(demand / order_quantity);
}

function evaluateTotalCosts(demand, setup_cost, holding_cost, order_quantity, period_orders, product_cost) {
  let ordering_cost = period_orders * setup_cost;
  let warehousing_cost = holding_cost * order_quantity / 2;
  let purchase_cost = product_cost * demand;
  let total_cost = ordering_cost + warehousing_cost + purchase_cost;
  return {
    ordering_cost,
    warehousing_cost,
    purchase_cost,
    total_cost
  };
}

number_inputs.forEach((input) => {
  input.addEventListener("invalid", function() {
    let alert = "Inserire un numero";
    if (this.value < this.min) {
      alert = `Inserire un valore uguale o superiore a ${this.min}`;
    }
    this.setCustomValidity(alert);
  });
  input.addEventListener("input", function() {
    this.setCustomValidity("");
  });
});

item_cost_checkbox.addEventListener("change", function() {
  if (this.checked == true) {
    product_cost_fieldset.disabled = false;
    discount_checkbox.dispatchEvent(new Event("change"));
  }  else {
    product_cost_fieldset.disabled = true;
    if (!discount_fieldset.disabled) {
      discount_fieldset.disabled = true;
    }
  }
}, false)

discount_checkbox.addEventListener("change", function() {
  if (this.checked == true) {
    discount_fieldset.disabled = false;
  }  else {
   discount_fieldset.disabled = true;
  }
}, false)

discount_tier_checkboxes[0].addEventListener("change", function() {
  let inputs = discount_tier_checkboxes[0].parentElement.querySelectorAll("input[type=number]");
  if (this.checked == true) {
    inputs.forEach((input) => {
      input.disabled = false;
    })
    discount_tier_checkboxes[1].disabled = false;
  } else {
    inputs.forEach((input => {
      input.disabled = true;
    }))
    discount_tier_checkboxes[1].disabled = true;
    discount_tier_checkboxes[1].checked = false;
    discount_tier_checkboxes[1].dispatchEvent(new Event("change"));
  }
}, false)

discount_tier_checkboxes[1].addEventListener("change", function() {
  let inputs = discount_tier_checkboxes[1].parentElement.querySelectorAll("input[type=number]");
  if (this.checked == true) {
    inputs.forEach((input) => {
      input.disabled = false;
    })
  } else {
    inputs.forEach((input => {
      input.disabled = true;
    }))
  }
}, false)

eoq_form.addEventListener("submit", function(e) {
  e.preventDefault();
  handleSubmit();
}, false);

function evaluateDiscountedCosts(demand, setup_cost, product_cost, product_maintenance_rate, fixed_holding_cost, discounts) {
  let costs = [];
  let ordered_discounts = discounts.toSorted((a, b) => a.discount_quantity - b.discount_quantity);

  for (let i = 0; i < ordered_discounts.length; i++) {
    let discount_quantity = ordered_discounts[i].discount_quantity;
    let discount_rate = ordered_discounts[i].discount_rate;
    let discounted_product_cost = (product_cost * (1 - discount_rate / 100)).toFixed(2);
    let discounted_holding_cost = ((discounted_product_cost * product_maintenance_rate / 100) + fixed_holding_cost).toFixed(2);
    let eoq = evaluateEOQ(demand, setup_cost, discounted_holding_cost);
    let order_quantity = eoq;

    let valid_quantity = true;
    for (let j = i+1; j < ordered_discounts.length; j++) {
      if (order_quantity > ordered_discounts[j].discount_quantity && valid_quantity == true) {
        valid_quantity = false;
      }
    }

    if (valid_quantity) {
      if (order_quantity < discount_quantity) {
        order_quantity = discount_quantity;
      }

      let period_orders = evaluatePeriodOrders(demand, order_quantity);

      let total_costs = evaluateTotalCosts(demand, setup_cost, discounted_holding_cost, order_quantity, period_orders, discounted_product_cost);
      costs.push({
        discount_rate,
        discount_quantity,
        total_costs,
        eoq,
        order_quantity,
        product_cost: discounted_product_cost,
        holding_cost: discounted_holding_cost,
        period_orders,
        valid_quantity
      });
    } else {
      costs.push({
        discount_rate,
        discount_quantity,
        eoq,
        order_quantity,
        product_cost: discounted_product_cost,
        valid_quantity
      });
    }
  }
  return costs;
}

function handleSubmit() {
  let demand = +document.getElementById("demand").value;
  let fixed_holding_cost = +document.getElementById("fixed-holding-cost").value;
  let setup_cost = +document.getElementById("setup-cost").value;
  let product_cost = 0;
  let product_maintenance_rate = 0;

  let holding_cost = fixed_holding_cost;

  if (!product_cost_fieldset.disabled) {
    product_cost = +document.getElementById("product-cost").value;
    product_maintenance_rate = +document.getElementById("product-maintenance-rate").value;
    holding_cost += product_cost * product_maintenance_rate / 100;
  }

  let results = "";
  
  if (discount_fieldset.disabled) {
    let eoq = evaluateEOQ(demand, setup_cost, holding_cost);
    let optimal_orders = evaluatePeriodOrders(demand, eoq);
    let costs = evaluateTotalCosts(demand, setup_cost, holding_cost, eoq, optimal_orders, product_cost);
    results += `<div class="regular-eoq">`;
    results += `<p>L'EOQ è di <b>${eoq}</b> pezzi.</p>`;
    results +=  `<p>Il numero ottimale di ordini da eseguire nel corso dell'anno è di <b>${optimal_orders}</b>.</p>`;
    results += `<p class="costs">Costi di ordinazione: <b>${costs.ordering_cost.toFixed(2)} €</b></p>`;
    results += `<p class="costs">Costi di magazzino: <b>${costs.warehousing_cost.toFixed(2)} €</b></p>`;
    if (!product_cost_fieldset.disabled) {
      results += `<p class="costs">Costi di acquisto: <b>${costs.purchase_cost.toFixed(2)} €</b></p>`;
    }
    results += `<p class="costs total-costs">Costi totali di inventario: <b>${costs.total_cost.toFixed(2)} €</b></p>`;
    if (product_cost_fieldset.disabled) {
      results += `<p class="note">Nota: non sono inclusi i costi di acquisto.</p>`
    }
    results += `</div>`;
  } else {
    let discounts = [{
      discount_quantity: 0,
      discount_rate: 0
    }];

    document.querySelectorAll("div.discount-row").forEach((discount_row) => {
      let discount = {
        discount_quantity: 0,
        discount_rate: 0
      };

      if (discount_row.firstElementChild.tagName !== "INPUT" || discount_row.firstElementChild.checked == true) {
        discount_row.querySelectorAll("input").forEach((discount_input) => {
          if (discount_input.className.includes("minimum-quantity-discount")) {
            discount.discount_quantity = discount_input.value;
          } else if (discount_input.className.includes("discount-rate")) {
            discount.discount_rate = discount_input.value;
          }
        });
        discounts.push(discount);
      }
    });

    let costs = evaluateDiscountedCosts(demand, setup_cost, product_cost, product_maintenance_rate, fixed_holding_cost, discounts);
    results += `<div class="discounted-eoq">`;
    costs.forEach(discount_tier => {
      results += `<div class="discount-tier"><p>Valutando l'acquisto `
      if (discount_tier.discount_rate == 0) {
        results += "senza sconti";
      } else {
        results += `con lo sconto del <b>${discount_tier.discount_rate}%</b> (<b>${discount_tier.product_cost} €</b>)`;
      }
      results += `, l'EOQ è di <b>${discount_tier.eoq} pezzi</b>.`;
      if (discount_tier.valid_quantity) {
        if (discount_tier.order_quantity !== discount_tier.eoq) {
          results += ` Per raggiungere lo sconto, la quantità dev'essere aggiustata a <b>${discount_tier.order_quantity}</b> pezzi.`;
        }
        results += `</p><p>Il numero ottimale di ordini da eseguire nel corso dell'anno è di <b>${discount_tier.period_orders}</b>.</p>`;
        results += `<p class="costs">Costi di ordinazione: <b>${discount_tier.total_costs.ordering_cost.toFixed(2)} €</b></p>`;
        results += `<p class="costs">Costi di magazzino: <b>${discount_tier.total_costs.warehousing_cost.toFixed(2)} €</b></p>`;
        results += `<p class="costs">Costi di acquisto: <b>${discount_tier.total_costs.purchase_cost.toFixed(2)} €</b></p>`;
        results += `<p class="costs total-costs">Costi totali di inventario: <b>${discount_tier.total_costs.total_cost.toFixed(2)} €</b></p>`;
      } else {
        results += `</p><p>Questo <b>non è valido</b>, perché questa quantità raggiungerebbe un livello di sconto superiore.`;
      }
      results += `</div>`
    });
    let validCosts = costs.filter(discount_tier => discount_tier.valid_quantity == true);
    let min = Math.min(...validCosts.map(discount_tier => discount_tier.total_costs.total_cost));
    let index = validCosts.findIndex(discount_tier => discount_tier.total_costs.total_cost === min);
    let selected = validCosts[index];
    results += `<div id="conclusion">I costi totali di inventario minori (<b>${selected.total_costs.total_cost.toFixed(2)} €</b>) si ottengono ordinando <b>${selected.order_quantity == selected.eoq ? selected.eoq : selected.order_quantity}</b> pezzi <b>${selected.period_orders}</b> volte all'anno, `;
    if (selected.discount_rate !== 0) {
      results += `usufruendo dello sconto del <b>${selected.discount_rate}%</b> su ordini uguali o superiori alle <b>${selected.discount_quantity}</b> unità.`;
    } else {
      results += `senza usufruire di nessuno degli sconti offerti.`;
    }
    results += "</div>";
  }
  results_div.innerHTML = results;
  results_div.style.opacity = 1;
}
