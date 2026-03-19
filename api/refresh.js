const axios = require('axios');

const SYMBOLS = ['FFC', 'MEBL', 'POL', 'SYS', 'AIRLINK'];

const FALLBACK_CLOSE = {
  FFC: 533.87,
  MEBL: 441.49,
  POL: 611.00,
  SYS: 122.39,
  AIRLINK: 137.00,
  KSE100: 149178.5
};

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Attempt to fetch market watch
    const { data } = await axios.get('https://dps.psx.com.pk/market-watch', {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://dps.psx.com.pk/'
      }
    });

    if (!Array.isArray(data)) throw new Error('Invalid market-watch response');

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

      if (sym.includes('KSE100') || sym === 'KSE100') {
        kseCurrent = current;
        kseLdcp = ldcp;
      }
    });

    // Fill missing symbols with fallback
    SYMBOLS.forEach(sym => {
      if (!prices[sym]) {
        prices[sym] = {
          current: FALLBACK_CLOSE[sym],
          change: 0,
          changePct: 0
        };
      }
    });

    if (!kseCurrent || isNaN(kseCurrent)) {
      kseCurrent = FALLBACK_CLOSE.KSE100;
      kseLdcp = kseCurrent;
    }
    const kseChangePct = kseLdcp ? ((kseCurrent - kseLdcp) / kseLdcp) * 100 : 0;

    return res.status(200).json({
      prices,
      kse: { current: kseCurrent, changePct: kseChangePct },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API error:', error.message);
    // Return fallback data with an error flag
    const fallbackPrices = {};
    SYMBOLS.forEach(sym => {
      fallbackPrices[sym] = {
        current: FALLBACK_CLOSE[sym],
        change: 0,
        changePct: 0
      };
    });
    return res.status(200).json({
      prices: fallbackPrices,
      kse: { current: FALLBACK_CLOSE.KSE100, changePct: 0 },
      error: 'Could not fetch live data, using fallback',
      timestamp: new Date().toISOString()
    });
  }
};