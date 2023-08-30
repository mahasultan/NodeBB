import * as express from 'express';
import * as url from 'url';
import * as plugins from '../plugins';
import * as meta from '../meta';
import * as user from '../user';

declare module 'express' {
    interface Request {
        uid: string;
    }
}


function adminHomePageRoute(): string {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const { config } = meta;
    const { homePageRoute } = config;
    const { homePageCustom } = config;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const route = (homePageRoute === 'custom' ? homePageCustom : homePageRoute) || 'categories';

    return route.replace(/^\//, '');
}

async function getUserHomeRoute(uid: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const settings = await user.getSettings(uid);
    let route = adminHomePageRoute();

    if (settings.homePageRoute !== 'undefined' && settings.homePageRoute !== 'none') {
        route = (settings.homePageRoute || route).replace(/^\/+/, '');
    }

    return route;
}

async function rewrite(req: express.Request, res: express.Response, next: express.NextFunction): Promise<void> {
    if (req.path !== '/' && req.path !== '/api/' && req.path !== '/api') {
        return next();
    }
    let route = adminHomePageRoute();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    if (meta.config.allowUserHomePage) {
        route = await getUserHomeRoute(req.uid);
    }

    let parsedUrl: url.UrlWithParsedQuery;
    try {
        parsedUrl = url.parse(route, true);
    } catch (err) {
        return next(err);
    }

    const { pathname } = parsedUrl;
    const hook = `action:homepage.get:${pathname}`;
    if (!plugins.hooks.hasListeners(hook)) {
        req.url = req.path + (!req.path.endsWith('/') ? '/' : '') + pathname;
    } else {
        res.locals.homePageRoute = pathname;
    }
    req.query = Object.assign(parsedUrl.query, req.query);

    next();
}

export { rewrite };

function pluginHook(req: express.Request, res: express.Response, next: express.NextFunction): void {
    const hook = `action:homepage.get:${res.locals.homePageRoute}`;
    plugins.hooks.fire(hook, {
        req: req,
        res: res,
        next: next,
    });
}


export { pluginHook };
