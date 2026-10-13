import { useMemo, useState } from "react";

function Customers({ transactions, formatMoney, deleteTransaction }) {
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const customers = useMemo(() => {
    const customerNames = [
      ...new Set(
        transactions
          .filter((item) => item.customer)
          .map((item) => item.customer),
      ),
    ];

    return customerNames.map((name) => {
      const customerTransactions = transactions.filter(
        (item) => item.customer === name,
      );

      const totalJobs = customerTransactions
        .filter((item) => item.type === "job")
        .reduce((sum, item) => sum + Number(item.amount), 0);

      const totalPayments = customerTransactions
        .filter((item) => item.type === "payment")
        .reduce((sum, item) => sum + Number(item.amount), 0);

      return {
        name,
        totalJobs,
        totalPayments,
        balance: totalJobs - totalPayments,
        transactions: customerTransactions,
      };
    });
  }, [transactions]);

  const filteredCustomers = customers.filter((customer) =>
    customer.name
      .toLocaleLowerCase("tr-TR")
      .includes(search.toLocaleLowerCase("tr-TR")),
  );

  const customer = customers.find((item) => item.name === selectedCustomer);

  if (selectedCustomer && customer) {
    return (
      <div className="customers-page">
        <div className="customer-detail-header">
          <button
            type="button"
            className="back-button"
            onClick={() => setSelectedCustomer(null)}
          >
            ←
          </button>

          <div>
            <p>Müşteri hesabı</p>
            <h1>{customer.name}</h1>
          </div>
        </div>

        <div className="customer-detail-summary">
          <div>
            <span>Toplam İş</span>

            <strong>{formatMoney(customer.totalJobs)} ₺</strong>
          </div>

          <div>
            <span>Tahsilat</span>

            <strong className="income">
              {formatMoney(customer.totalPayments)} ₺
            </strong>
          </div>

          <div>
            <span>Kalan Alacak</span>

            <strong className={customer.balance > 0 ? "expense" : "income"}>
              {formatMoney(customer.balance)} ₺
            </strong>
          </div>
        </div>

        <div className="customer-detail-title">
          <h2>Hesap Hareketleri</h2>

          <span>{customer.transactions.length} işlem</span>
        </div>

        <div className="transactions">
          {customer.transactions.map((item) => (
            <div className="transaction" key={item.id}>
              <div className="transaction-icon">
                {item.type === "job" && "🧾"}
                {item.type === "payment" && "💰"}
              </div>

              <div className="transaction-info">
                <strong>{item.title}</strong>

                {item.type === "job" &&
                item.unitType &&
                item.unitType !== "fixed" &&
                item.quantity != null &&
                item.unitPrice != null ? (
                  <span>
                    {formatQuantity(item.quantity)}{" "}
                    {getUnitLabel(item.unitType)} ×{" "}
                    {formatMoney(item.unitPrice)} ₺
                  </span>
                ) : null}

                <span>{formatDate(item.date)}</span>
              </div>

              <strong className={item.type === "payment" ? "income" : ""}>
                {item.type === "payment" ? "-" : "+"}
                {formatMoney(item.amount)} ₺
              </strong>

              <button
                type="button"
                className="delete-transaction-button"
                onClick={() => {
                  deleteTransaction(item.id);
                }}
                title="İşlemi sil"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="customers-page">
      <div className="customers-header">
        <div>
          <p>Müşteri hesapları</p>
          <h1>Müşteriler</h1>
        </div>

        <div className="customer-count">{customers.length}</div>
      </div>

      <div className="customer-search">
        <span>⌕</span>

        <input
          type="text"
          placeholder="Müşteri ara..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="customer-list">
        {filteredCustomers.length === 0 ? (
          <div className="empty-customers">
            {customers.length === 0
              ? "Henüz müşteri bulunmuyor."
              : "Aradığınız müşteri bulunamadı."}
          </div>
        ) : (
          filteredCustomers.map((item) => (
            <button
              type="button"
              className="customer-card customer-card-button"
              key={item.name}
              onClick={() => setSelectedCustomer(item.name)}
            >
              <div className="customer-top">
                <div className="customer-avatar">
                  {item.name.charAt(0).toUpperCase()}
                </div>

                <div className="customer-name">
                  <strong>{item.name}</strong>
                  <span>Müşteri hesabı</span>
                </div>

                <span className="customer-arrow">›</span>
              </div>

              <div className="customer-stats">
                <div>
                  <span>Toplam İş</span>

                  <strong>{formatMoney(item.totalJobs)} ₺</strong>
                </div>

                <div>
                  <span>Tahsilat</span>

                  <strong className="income">
                    {formatMoney(item.totalPayments)} ₺
                  </strong>
                </div>

                <div>
                  <span>Kalan</span>

                  <strong className={item.balance > 0 ? "expense" : "income"}>
                    {formatMoney(item.balance)} ₺
                  </strong>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function getUnitLabel(unitType) {
  if (unitType === "adet") {
    return "Adet";
  }

  if (unitType === "m2") {
    return "m²";
  }

  return "";
}

function formatQuantity(quantity) {
  return new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: 2,
  }).format(Number(quantity));
}

function formatDate(date) {
  if (!date) return "";

  return new Intl.DateTimeFormat("tr-TR").format(new Date(`${date}T00:00:00`));
}

export default Customers;
