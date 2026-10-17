
      // frost.js reads its asset base when it loads; beside this file when mounted.
      if (typeof __hyperframes !== "undefined" && __hyperframes.assetUrl)
        window.__frostAssetBase = __hyperframes.assetUrl("assets/");
    
