const axios = require('axios');

// Symbols we track
const SYMBOLS = ['FFC', 'MEBL', 'POL', 'SYS', 'AIRLINK'];

// Fallback close prices (used only if everything fails)
const FALLBACK_CLOSE = {
  FFC: 533.87,
  MEBL: 441.49,
  POL: 611.00,
  SYS: 122.39,
  AIRLINK: 137.00,
  KSE100: 149178.5   // approximate last known
};

module.exports = async (req, res) => {
  // Enable CORS for frontend (though on same origin it's not strictly needed)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. Try the bulk market-watch endpoint first
    const { data } = await axios.get('https://dps.psx.com.pk/market-watch', {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!Array.isArray(data)) throw new Error('Invalid market-watch response');

    // 2. Build price map
    const prices = {};
    let kseCurrent = null;
    let kseLdcp = null;

    data.forEach(item => {
      const sym = (item.symbol || item.SYMBOL || '').toString().toUpperCase().trim();
      const current = parseFloat(item.current || item.ltp || item.close);
      const ldcp = parseFloat(item.ldcp || item.prev_close);

      if (SYMBOLS.includes(sym) && !isNaN(current) && current > 0) {
        prices[sym] = {
          current,
          change: current - (ldcp || current),
          changePct: ldcp ? ((current - ldcp) / ldcp) * 100 : 0
        };
      }

      // Detect KSE-100 index
      if ((sym.includes('KSE') && sym.includes('100')) || sym === 'KSE100') {
        kseCurrent = current;
        kseLdcp = ldcp;
      }
    });

    // 3. If we didn't get all symbols, try fetching individually (fallback)
    const missing = SYMBOLS.filter(sym => !prices[sym]);
    if (missing.length > 0) {
      await Promise.all(missing.map(async sym => {
        try {
          // Try intraday first, then EOD
          let resp = await axios.get(`https://dps.psx.com.pk/timeseries/int/${sym}`, { timeout: 3000 });
          if (resp.data && resp.data.close && resp.data.close.length) {
            const close = resp.data.close;
            const cur = close[close.length - 1];
            const prev = close.length >= 2 ? close[close.length - 2] : FALLBACK_CLOSE[sym];
            if (!isNaN(cur) && cur > 0) {
              prices[sym] = {
                current: cur,
                change: cur - prev,
                changePct: prev ? ((cur - prev) / prev) * 100 : 0
              };
              return;
            }
          }
          // Fallback to EOD
          resp = await axios.get(`https://dps.psx.com.pk/timeseries/eod/${sym}`, { timeout: 3000 });
          if (resp.data && resp.data.close && resp.data.close.length) {
            const close = resp.data.close;
            const cur = close[close.length - 1];
            const prev = close.length >= 2 ? close[close.length - 2] : FALLBACK_CLOSE[sym];
            if (!isNaN(cur) && cur > 0) {
              prices[sym] = {
                current: cur,
                change: cur - prev,
                changePct: prev ? ((cur - prev) / prev) * 100 : 0
              };
            }
          }
        } catch (e) {
          // ignore, keep missing
        }
      }));
    }

    // 4. Fill any still missing symbols with fallback (no change data)
    SYMBOLS.forEach(sym => {
      if (!prices[sym]) {
        prices[sym] = {
          current: FALLBACK_CLOSE[sym],
          change: 0,
          changePct: 0
        };
      }
    });

    // 5. KSE-100 fallback if not found
    if (!kseCurrent || isNaN(kseCurrent)) {
      kseCurrent = FALLBACK_CLOSE.KSE100;
      kseLdcp = kseCurrent;
    }
    const kseChangePct = kseLdcp ? ((kseCurrent - kseLdcp) / kseLdcp) * 100 : 0;

    // 6. Return JSON
    res.status(200).json({
      prices,
      kse: {
        current: kseCurrent,
        changePct: kseChangePct
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Refresh error:', error.message);
    // On total failure, return fallback data with 200 but mark as stale
    const fallbackPrices = {};
    SYMBOLS.forEach(sym => {
      fallbackPrices[sym] = {
        current: FALLBACK_CLOSE[sym],
        change: 0,
        changePct: 0
      };
    });
    res.status(200).json({
      prices: fallbackPrices,
      kse: {
        current: FALLBACK_CLOSE.KSE100,
        changePct: 0
      },
      error: 'Could not fetch live data, using fallback',
      timestamp: new Date().toISOString()
    });
  }
};
