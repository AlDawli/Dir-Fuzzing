import React, { useState, useRef } from 'react';
import { Search, Play, Pause, Download, AlertCircle, CheckCircle, XCircle, Loader } from 'lucide-react';

export default function DirectoryFuzzer() {
  const [targetUrl, setTargetUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState({ found: 0, notFound: 0, errors: 0 });
  const abortControllerRef = useRef(null);

  const commonPaths = [
    'admin', 'administrator', 'login', 'dashboard', 'wp-admin', 'phpmyadmin',
    'cpanel', 'panel', 'control', 'api', 'backup', 'backups', 'db', 'database',
    'config', 'configuration', 'settings', 'setup', 'install', 'old', 'new',
    'test', 'demo', 'dev', 'development', 'staging', 'beta', 'temp', 'tmp',
    'private', 'secret', 'hidden', 'uploads', 'images', 'img', 'files', 'docs',
    'documents', 'download', 'downloads', 'static', 'assets', 'css', 'js',
    'scripts', 'includes', 'inc', 'lib', 'libraries', 'vendor', 'node_modules',
    'logs', 'log', 'errors', 'debug', 'trace', 'admin.php', 'login.php',
    'config.php', 'database.php', '.git', '.env', '.htaccess', 'robots.txt',
    'sitemap.xml', 'wp-config.php', 'web.config', 'README.md', 'LICENSE'
  ];

  const normalizeUrl = (url) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    return url.endsWith('/') ? url.slice(0, -1) : url;
  };

  const checkPath = async (baseUrl, path) => {
    const url = `${baseUrl}/${path}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        signal: abortControllerRef.current?.signal,
        mode: 'no-cors'
      });
      
      // With no-cors mode, we can't read the response status
      // This is a limitation of browser-based scanning
      return {
        path,
        url,
        status: 'Unknown (CORS)',
        found: true,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        throw error;
      }
      return {
        path,
        url,
        status: error.message,
        found: false,
        timestamp: new Date().toISOString()
      };
    }
  };

  const startScan = async () => {
    if (!targetUrl.trim()) {
      alert('Please enter a target URL');
      return;
    }

    setIsScanning(true);
    setIsPaused(false);
    setResults([]);
    setProgress(0);
    setStats({ found: 0, notFound: 0, errors: 0 });

    const baseUrl = normalizeUrl(targetUrl);
    abortControllerRef.current = new AbortController();

    let currentStats = { found: 0, notFound: 0, errors: 0 };

    for (let i = 0; i < commonPaths.length; i++) {
      if (abortControllerRef.current?.signal.aborted) break;
      if (isPaused) {
        await new Promise(resolve => {
          const checkPause = setInterval(() => {
            if (!isPaused || abortControllerRef.current?.signal.aborted) {
              clearInterval(checkPause);
              resolve();
            }
          }, 100);
        });
      }

      try {
        const result = await checkPath(baseUrl, commonPaths[i]);
        
        setResults(prev => [result, ...prev]);
        
        if (result.found) {
          currentStats.found++;
        } else {
          currentStats.notFound++;
        }
        
        setStats({ ...currentStats });
        setProgress(((i + 1) / commonPaths.length) * 100);
        
        // Small delay to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        if (error.name === 'AbortError') break;
        currentStats.errors++;
        setStats({ ...currentStats });
      }
    }

    setIsScanning(false);
    setIsPaused(false);
  };

  const stopScan = () => {
    abortControllerRef.current?.abort();
    setIsScanning(false);
    setIsPaused(false);
  };

  const togglePause = () => {
    setIsPaused(!isPaused);
  };

  const exportResults = () => {
    const data = results.map(r => ({
      path: r.path,
      url: r.url,
      status: r.status,
      found: r.found,
      timestamp: r.timestamp
    }));
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuzzer-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Directory Fuzzer
          </h1>
          <p className="text-gray-400">Discover hidden directories and files on web servers</p>
        </div>

        {/* Warning */}
        <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <strong>Legal Notice:</strong> Only use this tool on systems you own or have explicit permission to test. 
            Unauthorized access to computer systems is illegal. Note: Browser-based scanning has CORS limitations.
          </div>
        </div>

        {/* Input Section */}
        <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2 text-gray-300">Target URL</label>
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://example.com"
                disabled={isScanning}
                className="w-full bg-gray-900/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex items-end gap-2">
              {!isScanning ? (
                <button
                  onClick={startScan}
                  className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start Scan
                </button>
              ) : (
                <>
                  <button
                    onClick={togglePause}
                    className="bg-yellow-600 hover:bg-yellow-700 px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </button>
                  <button
                    onClick={stopScan}
                    className="bg-red-600 hover:bg-red-700 px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Stop
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Progress and Stats */}
        {isScanning && (
          <div className="bg-gray-800/50 backdrop-blur rounded-lg p-6 mb-6 border border-gray-700">
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Progress</span>
                <span className="text-gray-300">{Math.round(progress)}%</span>
              </div>
              <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-gray-400">Found</span>
                </div>
                <div className="text-2xl font-bold text-green-400">{stats.found}</div>
              </div>
              <div className="bg-red-900/20 border border-red-600/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <XCircle className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-400">Not Found</span>
                </div>
                <div className="text-2xl font-bold text-red-400">{stats.notFound}</div>
              </div>
              <div className="bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm text-gray-400">Errors</span>
                </div>
                <div className="text-2xl font-bold text-yellow-400">{stats.errors}</div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-gray-800/50 backdrop-blur rounded-lg border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Results ({results.length})</h2>
              <button
                onClick={exportResults}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export JSON
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-4 border-b border-gray-700 last:border-b-0 hover:bg-gray-700/30 transition-colors ${
                    result.found ? 'bg-green-900/10' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {result.found ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        <code className="text-sm font-mono text-blue-400">{result.path}</code>
                      </div>
                      <div className="text-xs text-gray-500 break-all">{result.url}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`text-xs font-medium ${
                        result.found ? 'text-green-400' : 'text-gray-500'
                      }`}>
                        {result.status}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info */}
        {results.length === 0 && !isScanning && (
          <div className="text-center py-12 text-gray-500">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Enter a target URL and start scanning to discover hidden directories</p>
          </div>
        )}
      </div>
    </div>
  );
}