"use client";

export default function SimpleDashboardPage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Total Balance</h2>
          <p className="text-3xl font-bold text-blue-600">$218,340</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Revenue</h2>
          <p className="text-3xl font-bold text-green-600">$112,000</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Expenses</h2>
          <p className="text-3xl font-bold text-red-600">$79,000</p>
        </div>
      </div>
      <div className="mt-8 bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Welcome to CashFlow.ai</h2>
        <p className="text-gray-600">This is a simplified dashboard running in DEV mode without Keycloak authentication.</p>
      </div>
    </div>
  );
}
