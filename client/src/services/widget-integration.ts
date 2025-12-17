// ============================================
// µCodeLab v2.0 - Widget API Integration Service
// Connects to external IoT widget libraries and data sources
// ============================================

/**
 * External Widget Integration Manager
 * Handles importing widgets from various IoT platforms
 */
class WidgetIntegrationService {
  private config: any;
  private widgetCache: Map<string, any>;
  private apiConnections: Map<string, any>;

  constructor(config = {}) {
    this.config = {
      cacheEnabled: true,
      cacheDuration: 3600000, // 1 hour
      timeout: 30000, // 30 seconds
      ...config
    };
    this.widgetCache = new Map();
    this.apiConnections = new Map();
  }

  // ============================================
  // THINGSBOARD INTEGRATION
  // ============================================

  /**
   * Connect to ThingsBoard and fetch available widgets
   */
  async connectThingsBoard(endpoint: string, token: string) {
    try {
      const response = await fetch(`${endpoint}/api/widgetsBundles`, {
        method: 'GET',
        headers: {
          'X-Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`ThingsBoard API error: ${response.status}`);
      }

      const bundles = await response.json();
      return this.parseThingsBoardBundles(bundles);
    } catch (error) {
      console.error('ThingsBoard connection failed:', error);
      throw error;
    }
  }

  /**
   * Parse ThingsBoard widget bundles
   */
  parseThingsBoardBundles(bundles: any[]) {
    const widgets: any[] = [];
    
    bundles.forEach(bundle => {
      bundle.widgets?.forEach((widget: any) => {
        widgets.push({
          id: widget.id,
          name: widget.name,
          type: this.mapThingsBoardType(widget.type),
          source: 'thingsboard',
          description: widget.description,
          config: this.convertThingsBoardConfig(widget.descriptor),
          preview: widget.image,
          tags: widget.tags || []
        });
      });
    });

    return widgets;
  }

  /**
   * Map ThingsBoard widget types to µCodeLab types
   */
  mapThingsBoardType(tbType: string) {
    const typeMap: Record<string, string> = {
      'timeseries': 'lineChart',
      'latest': 'valueDisplay',
      'rpc': 'button',
      'alarm': 'textDisplay',
      'static': 'container'
    };
    return typeMap[tbType] || 'container';
  }

  /**
   * Convert ThingsBoard configuration to µCodeLab format
   */
  convertThingsBoardConfig(descriptor: any) {
    return {
      title: descriptor.title || 'Widget',
      settings: descriptor.settings || {},
      dataKeys: descriptor.dataKeys?.map((key: any) => ({
        name: key.name,
        label: key.label,
        type: key.type
      })) || [],
      actions: descriptor.actions || []
    };
  }

  // ============================================
  // NODE-RED INTEGRATION
  // ============================================

  /**
   * Search Node-RED dashboard widgets from npm registry
   */
  async searchNodeREDWidgets(query = 'node-red-dashboard') {
    try {
      const response = await fetch(
        `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=100`,
        { signal: AbortSignal.timeout(this.config.timeout) }
      );

      if (!response.ok) {
        throw new Error(`npm registry error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseNodeREDPackages(data.objects);
    } catch (error) {
      console.error('Node-RED search failed:', error);
      throw error;
    }
  }

  /**
   * Parse Node-RED packages
   */
  parseNodeREDPackages(packages: any[]) {
    return packages
      .filter(pkg => pkg.package.keywords?.includes('node-red-dashboard'))
      .map(pkg => ({
        id: pkg.package.name,
        name: pkg.package.name.replace('node-red-', ''),
        version: pkg.package.version,
        description: pkg.package.description,
        source: 'node-red',
        type: this.inferNodeREDType(pkg.package.name),
        repository: pkg.package.links?.repository,
        downloads: pkg.package.downloads || 0
      }));
  }

  /**
   * Infer widget type from Node-RED package name
   */
  inferNodeREDType(packageName: string) {
    if (packageName.includes('gauge')) return 'gauge';
    if (packageName.includes('chart')) return 'lineChart';
    if (packageName.includes('button')) return 'button';
    if (packageName.includes('slider')) return 'slider';
    if (packageName.includes('switch')) return 'toggle';
    return 'container';
  }

  // ============================================
  // GRAFANA INTEGRATION
  // ============================================

  /**
   * Fetch Grafana panel plugins
   */
  async fetchGrafanaPanels(apiKey?: string) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }

      const response = await fetch('https://grafana.com/api/plugins?type=panel', {
        headers,
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`Grafana API error: ${response.status}`);
      }

      const panels = await response.json();
      return this.parseGrafanaPanels(panels);
    } catch (error) {
      console.error('Grafana fetch failed:', error);
      throw error;
    }
  }

  /**
   * Parse Grafana panel plugins
   */
  parseGrafanaPanels(panels: any) {
    return panels.items?.map((panel: any) => ({
      id: panel.slug,
      name: panel.name,
      type: this.mapGrafanaType(panel.slug),
      source: 'grafana',
      description: panel.description,
      version: panel.version,
      downloads: panel.downloads,
      screenshots: panel.screenshots || [],
      config: {
        pluginId: panel.slug,
        version: panel.version
      }
    })) || [];
  }

  /**
   * Map Grafana panel types to µCodeLab types
   */
  mapGrafanaType(panelSlug: string) {
    if (panelSlug.includes('graph')) return 'lineChart';
    if (panelSlug.includes('gauge')) return 'gauge';
    if (panelSlug.includes('stat')) return 'valueDisplay';
    if (panelSlug.includes('table')) return 'textDisplay';
    if (panelSlug.includes('bar')) return 'barChart';
    return 'container';
  }

  // ============================================
  // IOT DATA SOURCE INTEGRATIONS
  // ============================================

  /**
   * Connect to ThingSpeak channel
   */
  async connectThingSpeak(channelId: string, apiKey: string, readKey: string) {
    const config = {
      source: 'thingspeak',
      channelId,
      apiKey,
      readKey,
      endpoint: `https://api.thingspeak.com/channels/${channelId}/feeds.json`,
      updateInterval: 15000 // ThingSpeak rate limit: 4 requests per minute
    };

    this.apiConnections.set(`thingspeak-${channelId}`, config);
    return config;
  }

  /**
   * Read data from ThingSpeak
   */
  async readThingSpeakData(channelId: string, options: any = {}) {
    const config = this.apiConnections.get(`thingspeak-${channelId}`);
    if (!config) {
      throw new Error('ThingSpeak channel not connected');
    }

    const params = new URLSearchParams({
      api_key: config.readKey,
      results: options.results || '100',
      ...options.filters
    });

    try {
      const response = await fetch(`${config.endpoint}?${params}`, {
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`ThingSpeak error: ${response.status}`);
      }

      const data = await response.json();
      return this.parseThingSpeakData(data);
    } catch (error) {
      console.error('ThingSpeak read failed:', error);
      throw error;
    }
  }

  /**
   * Parse ThingSpeak data format
   */
  parseThingSpeakData(data: any) {
    return {
      channelId: data.channel.id,
      name: data.channel.name,
      fields: Object.keys(data.channel)
        .filter(key => key.startsWith('field'))
        .map(key => ({
          name: key,
          label: data.channel[key]
        })),
      feeds: data.feeds.map((feed: any) => ({
        timestamp: new Date(feed.created_at),
        values: Object.entries(feed)
          .filter(([key]) => key.startsWith('field'))
          .reduce((acc: any, [key, value]) => {
            acc[key] = parseFloat(value as string);
            return acc;
          }, {})
      }))
    };
  }

  /**
   * Connect to Adafruit IO
   */
  async connectAdafruitIO(username: string, aioKey: string) {
    const config = {
      source: 'adafruit_io',
      username,
      aioKey,
      restEndpoint: `https://io.adafruit.com/api/v2/${username}`,
      mqttBroker: 'io.adafruit.com',
      mqttPort: 1883
    };

    this.apiConnections.set(`adafruit-${username}`, config);
    return config;
  }

  /**
   * List Adafruit IO feeds
   */
  async listAdafruitFeeds(username: string) {
    const config = this.apiConnections.get(`adafruit-${username}`);
    if (!config) {
      throw new Error('Adafruit IO not connected');
    }

    try {
      const response = await fetch(`${config.restEndpoint}/feeds`, {
        headers: {
          'X-AIO-Key': config.aioKey,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`Adafruit IO error: ${response.status}`);
      }

      const feeds = await response.json();
      return feeds.map((feed: any) => ({
        id: feed.id,
        key: feed.key,
        name: feed.name,
        description: feed.description,
        lastValue: feed.last_value,
        lastUpdate: new Date(feed.updated_at)
      }));
    } catch (error) {
      console.error('Adafruit IO list feeds failed:', error);
      throw error;
    }
  }

  /**
   * Convert external widget to µCodeLab format
   */
  async convertWidget(externalWidget: any) {
    const converter = this.getConverter(externalWidget.source);
    if (!converter) {
      throw new Error(`No converter available for ${externalWidget.source}`);
    }
    return converter(externalWidget);
  }

  /**
   * Get appropriate converter for widget source
   */
  getConverter(source: string) {
    const converters: Record<string, Function> = {
      'thingsboard': this.convertThingsBoardWidget.bind(this),
      'node-red': this.convertNodeREDWidget.bind(this),
      'grafana': this.convertGrafanaWidget.bind(this)
    };
    return converters[source];
  }

  /**
   * Convert ThingsBoard widget
   */
  convertThingsBoardWidget(widget: any) {
    return {
      id: `imported-${widget.id}`,
      type: widget.type,
      name: widget.name,
      description: widget.description,
      config: {
        ...widget.config,
        dataBinding: {
          mode: 'external',
          source: 'thingsboard',
          config: widget.config
        }
      }
    };
  }

  /**
   * Convert Node-RED widget
   */
  convertNodeREDWidget(widget: any) {
    return {
      id: `imported-${widget.id}`,
      type: widget.type,
      name: widget.name,
      description: widget.description,
      config: {
        npm_package: widget.id,
        version: widget.version,
        dataBinding: {
          mode: 'external',
          source: 'node-red'
        }
      }
    };
  }

  /**
   * Convert Grafana panel
   */
  convertGrafanaWidget(panel: any) {
    return {
      id: `imported-${panel.id}`,
      type: panel.type,
      name: panel.name,
      description: panel.description,
      config: {
        pluginId: panel.config.pluginId,
        version: panel.config.version,
        dataBinding: {
          mode: 'external',
          source: 'grafana'
        }
      }
    };
  }
}

// ============================================
// EXPORT SERVICE
// ============================================
export default WidgetIntegrationService;

// Example usage:
/*
const widgetService = new WidgetIntegrationService();

// Connect to ThingsBoard
const tbWidgets = await widgetService.connectThingsBoard(
  'https://demo.thingsboard.io',
  'your-jwt-token'
);

// Search Node-RED widgets
const nodeRedWidgets = await widgetService.searchNodeREDWidgets('node-red-dashboard-gauge');

// Connect to ThingSpeak
await widgetService.connectThingSpeak('123456', 'write-api-key', 'read-api-key');
const data = await widgetService.readThingSpeakData('123456', { results: 50 });

// Connect to Adafruit IO
await widgetService.connectAdafruitIO('username', 'aio-key');
const feeds = await widgetService.listAdafruitFeeds('username');

// Convert and install external widget
const externalWidget = tbWidgets[0];
const convertedWidget = await widgetService.convertWidget(externalWidget);
*/