// Copyright IBM Corp. 2013,2017. All Rights Reserved.
// Node module: loopback
// This file is licensed under the MIT License.
// License text available at https://opensource.org/licenses/MIT

import {Binding, Context, Constructor} from '@loopback/context';
import * as http from 'http';
import {SwaggerRouter} from './router/SwaggerRouter';
import {getApiSpec} from './router/metadata';
import {getAuthenticatedUser, Strategy} from '../../authentication'


const debug = require('debug')('loopback:Application');

export class Application extends Context {
  public mountControllers(router: SwaggerRouter) {
    this.find('controllers.*').forEach(b => {
      debug('mounting controller %j', b.key);
      const ctor = b.valueConstructor;
      if (!ctor) {
        throw new Error(`The controller ${b.key} was not bound via .toClass()`);
      }

      const ctorFactory = (req: http.ServerRequest, res: http.ServerResponse) => {
        const requestContext = new Context(this);
        requestContext.bind('http.request').to(req);
        requestContext.bind('http.response').to(res);
        //[rashmi] TODO calling authenticate() here only temporary until Middle design/implementation is in place 
        this.authenticate(req);
        return requestContext.get(b.key);
      };
      const apiSpec = getApiSpec(ctor);
      router.controller(ctorFactory, apiSpec);
    });
  }

  /**
   * Register a controller class with this application.
   *
   * @param controllerCtor {Function} The controller class (constructor function).
   * @return {Binding} The newly created binding, you can use the reference to further
   * modify the binding, e.g. lock the value to prevent further modifications.
   *
   * ```ts
   * @spec(apiSpec)
   * class MyController {
   * }
   * app.controller(MyController).lock();
   * ```
   */
  public controller<T>(controllerCtor: Constructor<T>): Binding {
    return this.bind('controllers.' + controllerCtor.name).toClass(controllerCtor);
  }

  public authenticate(req: http.ServerRequest) {
    const strategy = this.get('authentication.strategy');
    //for now, we assume requeired is always true for now.
    getAuthenticatedUser(true, req, strategy)
      .then((user : object) => {
        this.bind('authentication.user').to(user);
      }).catch((err: Error) => {
        throw err; //[rashmi] TODO re-throw here?
      });
  }
}
