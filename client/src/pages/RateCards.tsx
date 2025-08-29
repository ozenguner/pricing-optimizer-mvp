export function RateCards() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rate Cards</h1>
          <p className="mt-2 text-gray-600">
            Manage your pricing structures and rate cards
          </p>
        </div>
        <button className="btn-primary">
          Create Rate Card
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="text-center py-12">
            <span className="text-6xl">📋</span>
            <h3 className="text-lg font-medium text-gray-900 mt-4">No rate cards yet</h3>
            <p className="text-gray-600 mt-2">
              Create your first rate card to get started with pricing optimization
            </p>
            <button className="btn-primary mt-4">
              Create Your First Rate Card
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}