import Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';

export interface TemplateData {
  [key: string]: any;
}

export interface CompiledTemplate {
  name: string;
  template: HandlebarsTemplateDelegate;
  lastModified: Date;
}

export class EmailTemplateEngine {
  private templates = new Map<string, CompiledTemplate>();
  private templateDir: string;
  private cacheEnabled: boolean;

  constructor(templateDir: string = 'src/templates/email', cacheEnabled: boolean = true) {
    this.templateDir = path.resolve(templateDir);
    this.cacheEnabled = cacheEnabled;
    this.registerHelpers();
  }

  private registerHelpers(): void {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date: Date, format?: string) => {
      if (!date) return '';
      
      const d = new Date(date);
      if (format === 'short') {
        return d.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
      }
      return d.toLocaleDateString('en-US', { 
        weekday: 'long',
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    });

    // URL helper for safe link generation
    Handlebars.registerHelper('safeUrl', (url: string, params?: Record<string, string>) => {
      if (!url) return '';
      
      try {
        const urlObj = new URL(url);
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            urlObj.searchParams.set(key, value);
          });
        }
        return urlObj.toString();
      } catch {
        return url;
      }
    });

    // Conditional helper
    Handlebars.registerHelper('ifEquals', function(arg1: any, arg2: any, options: any) {
      return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
    });

    // Expiry time helper
    Handlebars.registerHelper('expiryTime', (expiresAt: Date) => {
      if (!expiresAt) return '24 hours';
      
      const now = new Date();
      const expiry = new Date(expiresAt);
      const diffMs = expiry.getTime() - now.getTime();
      const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));
      
      if (diffHours <= 1) return '1 hour';
      if (diffHours < 24) return `${diffHours} hours`;
      
      const diffDays = Math.ceil(diffHours / 24);
      return diffDays === 1 ? '1 day' : `${diffDays} days`;
    });

    // Capitalize helper
    Handlebars.registerHelper('capitalize', (str: string) => {
      if (!str) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    });
  }

  async loadTemplate(templateName: string): Promise<CompiledTemplate> {
    const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
    
    try {
      // Check cache first
      if (this.cacheEnabled && this.templates.has(templateName)) {
        const cached = this.templates.get(templateName)!;
        
        // Check if file has been modified
        const stats = await fs.stat(templatePath);
        if (stats.mtime <= cached.lastModified) {
          return cached;
        }
      }

      // Load and compile template
      const templateSource = await fs.readFile(templatePath, 'utf-8');
      const template = Handlebars.compile(templateSource);
      const stats = await fs.stat(templatePath);

      const compiled: CompiledTemplate = {
        name: templateName,
        template,
        lastModified: stats.mtime
      };

      if (this.cacheEnabled) {
        this.templates.set(templateName, compiled);
      }

      return compiled;
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Template not found: ${templateName} at ${templatePath}`);
      }
      throw new Error(`Failed to load template ${templateName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async render(templateName: string, data: TemplateData = {}): Promise<string> {
    try {
      const compiled = await this.loadTemplate(templateName);
      
      // Add common data available to all templates
      const templateData = {
        ...data,
        currentYear: new Date().getFullYear(),
        companyName: 'RateCard Lab',
        supportEmail: process.env.EMAIL_SUPPORT_ADDRESS || 'support@ratecardlab.com',
        baseUrl: process.env.BASE_URL || 'http://localhost:3000',
        timestamp: new Date()
      };

      return compiled.template(templateData);
    } catch (error) {
      throw new Error(`Template rendering failed for ${templateName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async renderWithLayout(templateName: string, data: TemplateData = {}, layoutName: string = 'base'): Promise<string> {
    try {
      // Render the main content first
      const content = await this.render(templateName, data);
      
      // Then render with layout
      return await this.render(layoutName, { ...data, content });
    } catch (error) {
      throw new Error(`Template rendering with layout failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  clearCache(): void {
    this.templates.clear();
  }

  getCachedTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  async precompileTemplates(templateNames?: string[]): Promise<void> {
    try {
      let templatesToLoad: string[] = [];
      
      if (templateNames) {
        templatesToLoad = templateNames;
      } else {
        // Load all .hbs files from template directory
        const files = await fs.readdir(this.templateDir);
        templatesToLoad = files
          .filter(file => file.endsWith('.hbs'))
          .map(file => path.basename(file, '.hbs'));
      }

      await Promise.all(
        templatesToLoad.map(name => this.loadTemplate(name))
      );
    } catch (error) {
      console.warn(`Failed to precompile some templates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async templateExists(templateName: string): Promise<boolean> {
    try {
      const templatePath = path.join(this.templateDir, `${templateName}.hbs`);
      await fs.access(templatePath);
      return true;
    } catch {
      return false;
    }
  }

  getTemplateDir(): string {
    return this.templateDir;
  }
}