export function Calculator() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pricing Calculator</h1>
        <p className="mt-2 text-gray-600">
          Calculate pricing based on your rate cards and quantities
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Calculate Pricing</h2>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <label className="form-label">Rate Card</label>
                <select className="form-input">
                  <option value="">Select a rate card...</option>
                </select>
              </div>
              
              <div>
                <label className="form-label">Items & Quantities</label>
                <div className="text-center py-8 text-gray-500">
                  Select a rate card to see available items
                </div>
              </div>
              
              <button className="btn-primary w-full" disabled>
                Calculate Pricing
              </button>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-medium text-gray-900">Results</h2>
          </div>
          <div className="card-body">
            <div className="text-center py-12 text-gray-500">
              <span className="text-6xl">🧮</span>
              <p className="mt-4">Calculation results will appear here</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}