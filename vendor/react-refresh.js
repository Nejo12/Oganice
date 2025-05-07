// React Refresh Runtime
(function(global) {
  'use strict';

  // React Refresh Runtime
  const ReactRefreshRuntime = {
    // Create a signature for a function
    createSignature: function(type, key) {
      return type + ':' + key;
    },

    // Register a component
    register: function(type, id) {
      const signature = this.createSignature(type, id);
      if (!this._signatures) {
        this._signatures = new Set();
      }
      this._signatures.add(signature);
      return signature;
    },

    // Perform a refresh
    performReactRefresh: function() {
      if (this._signatures) {
        console.log('[React Refresh] Performing refresh...');
        // In a real implementation, this would trigger a hot reload
        return true;
      }
      return false;
    }
  };

  // Expose the runtime
  global.__REACT_REFRESH_RUNTIME__ = ReactRefreshRuntime;

  // Add a message listener for refresh requests
  if (typeof window !== 'undefined') {
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'react-refresh') {
        ReactRefreshRuntime.performReactRefresh();
      }
    });
  }

  // Log initialization
  console.log('[React Refresh] Runtime initialized');
})(typeof global !== 'undefined' ? global : typeof window !== 'undefined' ? window : this); 