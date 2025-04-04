export default function About() {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-4xl w-full px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold mb-6 dark:text-white">The Ruff Ryders app™️</h1>
          
          <div className="prose dark:prose-invert mx-auto">
            <p className="mb-6">
              🤖 built by a hologram with AI 
            </p>

            <div className="flex justify-center">
              <a
                href="https://github.com/12ian34/ruff-ryders-app"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center space-x-2 px-6 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors no-underline"
              >
                <span>🌚 open sourced on github</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}