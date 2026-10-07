(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const money = (n) => "₱" + Number(n).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2});
  const storageKey = "everRiseDemoTransactions";
  let currentView = "dashboard";
  let activeLoan = "Car Loan";
  let activeMethod = "Bank Transfer";
  let demoAmount = 0;

  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2800);
  }

  function getTransactions() {
    try { return JSON.parse(localStorage.getItem(storageKey) || "[]"); }
    catch { return []; }
  }

  function saveTransactions(items) {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }

  function switchView(view) {
    const valid = ["dashboard","products","payments","security","help","history"];
    if (!valid.includes(view)) view = "dashboard";
    currentView = view;
    $$(".view-section").forEach(el => el.classList.remove("active"));
    $("#view-" + view).classList.add("active");
    $$("[data-view]").forEach(el => el.classList.toggle("active", el.dataset.view === view));
    window.scrollTo({top:0,behavior:"smooth"});
    if (view === "history") renderHistory();
  }

  $$("[data-view]").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      switchView(el.dataset.view);
    });
  });

  $("#toggle-pass").addEventListener("click", () => {
    const input = $("#auth-password");
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    $("#toggle-pass").textContent = visible ? "Show" : "Hide";
  });

  $("#login-form").addEventListener("submit", e => {
    e.preventDefault();
    const email = $("#auth-email").value.trim();
    const password = $("#auth-password").value.trim();
    if (!email || !password) return showToast("Please enter your email and password.");
    const btn = $("#login-btn");
    btn.disabled = true;
    btn.textContent = "Signing In...";
    setTimeout(() => {
      sessionStorage.setItem("everRiseLoggedIn","1");
      sessionStorage.setItem("everRiseEmail",email);
      $("#user-display").textContent = email;
      $("#auth-screen").style.display = "none";
      $("#app-content").style.display = "block";
      btn.disabled = false;
      btn.textContent = "Sign In Securely";
      switchView("dashboard");
      showToast("Welcome to your EverRise payment portal.");
    }, 450);
  });

  $("#logout-btn").addEventListener("click", () => {
    sessionStorage.removeItem("everRiseLoggedIn");
    sessionStorage.removeItem("everRiseEmail");
    $("#app-content").style.display = "none";
    $("#auth-screen").style.display = "flex";
    switchView("dashboard");
    showToast("You have been signed out.");
  });

  function setLoan(type) {
    activeLoan = type;
    $("#loan-car").classList.toggle("sel",type === "Car Loan");
    $("#loan-mortgage").classList.toggle("sel",type === "Mortgage Loan");
    lookupLoan();
  }
  $("#loan-car").addEventListener("click", () => setLoan("Car Loan"));
  $("#loan-mortgage").addEventListener("click", () => setLoan("Mortgage Loan"));

  function lookupLoan() {
    const account = $("#account-number").value.trim();
    const amountInput = $("#amount-to-pay");
    const amount = Number(amountInput.value);
    const card = $("#lookup-card");
    const continueBtn = $("#continue-details");

    if (account.length < 6 || !Number.isFinite(amount) || amount <= 0) {
      card.style.display = "none";
      continueBtn.disabled = true;
      demoAmount = 0;
      return;
    }

    // The user-entered amount is used directly. No random payment amount is generated.
    demoAmount = Math.round(amount * 100) / 100;

    // Keep the demo due date predictable without changing the payment amount.
    let hash = 0;
    for (const ch of account) hash = (hash + ch.charCodeAt(0) * 17) % 1000;
    const due = new Date();
    due.setDate(due.getDate() + 12 + (hash % 9));

    $("#summary-product").textContent = activeLoan;
    $("#summary-installment").textContent = money(demoAmount);
    $("#summary-due").textContent = due.toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"});
    $("#summary-total").textContent = money(demoAmount);
    card.style.display = "block";
    continueBtn.disabled = false;
  }

  $("#account-number").addEventListener("input", lookupLoan);
  $("#amount-to-pay").addEventListener("input", lookupLoan);

  function goStep(step) {
    $$(".panel").forEach(p => p.classList.remove("on"));
    $$(".prog").forEach((p,i) => p.classList.toggle("on",i < step));
    $("#panel" + step).classList.add("on");
  }

  $("#continue-details").addEventListener("click", () => {
    if ($("#account-number").value.trim().length < 6) return showToast("Enter a valid demo loan account number.");
    goStep(2);
    renderMethodFields();
  });
  $("#back-details").addEventListener("click", () => goStep(1));

  $$(".select-card[data-code]").forEach(card => {
    card.addEventListener("click", () => {
      $$(".select-card[data-code]").forEach(c => c.classList.remove("sel"));
      card.classList.add("sel");
      activeMethod = card.dataset.method;
      renderMethodFields();
    });
  });

  function renderMethodFields() {
    const fields = $("#method-fields");
    if (activeMethod === "Bank Transfer") {
      fields.innerHTML = `
        <div class="form-grid">
          <div class="field"><label for="bank-name">Bank Name *</label><input id="bank-name" placeholder="e.g. EverRise Bank"></div>
          <div class="field"><label for="bank-account">Account Number *</label><input id="bank-account" inputmode="numeric" placeholder="Enter account number"></div>
        </div>`;
    } else if (activeMethod === "Debit / Credit Card") {
      fields.innerHTML = `
        <div class="form-grid">
          <div class="field full"><label for="card-number">Card Number *</label><input id="card-number" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000"></div>
          <div class="field"><label for="card-expiry">Expiration *</label><input id="card-expiry" maxlength="5" placeholder="MM/YY"></div>
          <div class="field"><label for="card-cvc">CVC *</label><input id="card-cvc" type="password" inputmode="numeric" maxlength="4" placeholder="123"></div>
        </div>`;
      $("#card-number").addEventListener("input", e => {
        let v = e.target.value.replace(/\D/g,"").slice(0,16);
        e.target.value = v.replace(/(.{4})/g,"$1 ").trim();
      });
      $("#card-expiry").addEventListener("input", e => {
        let v = e.target.value.replace(/\D/g,"").slice(0,4);
        e.target.value = v.length > 2 ? v.slice(0,2) + "/" + v.slice(2) : v;
      });
    } else {
      fields.innerHTML = `
        <div class="form-grid">
          <div class="field full"><label for="wallet-id">Wallet Phone Number / ID *</label><input id="wallet-id" placeholder="09XX XXX XXXX"></div>
        </div>`;
    }
  }

  function validMethodFields() {
    const inputs = [...$("#method-fields").querySelectorAll("input")];
    if (inputs.some(i => !i.value.trim())) {
      showToast("Please complete all required payment fields.");
      return false;
    }
    if (activeMethod === "Debit / Credit Card") {
      const digits = $("#card-number").value.replace(/\D/g,"");
      if (digits.length < 12) { showToast("Enter a valid demo card number."); return false; }
      if (!/^\d{2}\/\d{2}$/.test($("#card-expiry").value)) { showToast("Enter the expiration as MM/YY."); return false; }
      if ($("#card-cvc").value.replace(/\D/g,"").length < 3) { showToast("Enter a valid CVC."); return false; }
    }
    return true;
  }

  $("#submit-payment").addEventListener("click", () => {
    if (!validMethodFields()) return;
    const btn = $("#submit-payment");
    btn.disabled = true;
    btn.textContent = "Processing...";
    setTimeout(() => {
      const account = $("#account-number").value.trim();
      const ref = "ER-" + new Date().getFullYear() + "-" + Math.floor(100000 + Math.random()*900000);
      const now = new Date();
      const txn = {
        refId:ref, loanType:activeLoan, accountNumber:account, amount:demoAmount,
        method:activeMethod, date:now.toISOString()
      };
      const items = getTransactions();
      items.unshift(txn);
      saveTransactions(items);
      $("#receipt-ref").textContent = ref;
      $("#receipt-account").textContent = "•••• " + account.slice(-4);
      $("#receipt-loan").textContent = activeLoan;
      $("#receipt-method").textContent = activeMethod;
      $("#receipt-amount").textContent = money(demoAmount);
      $("#receipt-date").textContent = now.toLocaleString("en-PH",{dateStyle:"medium",timeStyle:"short"});
      btn.disabled = false;
      btn.textContent = "Review & Confirm →";
      goStep(3);
      showToast("Payment confirmed. Reference " + ref);
    },650);
  });

  $("#new-payment").addEventListener("click", () => {
    $("#account-number").value = "";
    $("#amount-to-pay").value = "";
    $("#borrower-name").value = "";
    $("#lookup-card").style.display = "none";
    $("#continue-details").disabled = true;
    demoAmount = 0;
    activeLoan = "Car Loan";
    $("#loan-car").classList.add("sel");
    $("#loan-mortgage").classList.remove("sel");
    activeMethod = "Bank Transfer";
    $$(".select-card[data-code]").forEach(c => c.classList.toggle("sel",c.dataset.code === "bank"));
    goStep(1);
  });

  $("#print-receipt").addEventListener("click", () => window.print());

  function renderHistory() {
    const body = $("#history-body");
    const items = getTransactions();
    if (!items.length) {
      body.innerHTML = '<tr><td colspan="6" class="empty">No transactions yet. Make a payment to see it here.</td></tr>';
      return;
    }
    body.innerHTML = items.map(txn => {
      const d = new Date(txn.date);
      const masked = "•••• " + String(txn.accountNumber).slice(-4);
      return `<tr>
        <td style="font-family:monospace;font-weight:800;color:var(--navy)">${escapeHtml(txn.refId)}</td>
        <td>${d.toLocaleDateString("en-PH",{month:"short",day:"numeric",year:"numeric"})}</td>
        <td>${escapeHtml(txn.loanType)}</td>
        <td>${escapeHtml(masked)}</td>
        <td>${escapeHtml(txn.method)}</td>
        <td style="font-weight:900;color:var(--navy)">${money(txn.amount)}</td>
      </tr>`;
    }).join("");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
  }

  $$(".faq button").forEach(btn => {
    btn.addEventListener("click", () => {
      const item = btn.closest(".faq");
      item.classList.toggle("open");
      btn.querySelector("span").textContent = item.classList.contains("open") ? "−" : "+";
    });
  });

  // Restore a logged-in demo session after refresh.
  if (sessionStorage.getItem("everRiseLoggedIn") === "1") {
    $("#auth-screen").style.display = "none";
    $("#app-content").style.display = "block";
    $("#user-display").textContent = sessionStorage.getItem("everRiseEmail") || "user@everrise.com";
    renderMethodFields();
    renderHistory();
  } else {
    renderMethodFields();
  }
})();
