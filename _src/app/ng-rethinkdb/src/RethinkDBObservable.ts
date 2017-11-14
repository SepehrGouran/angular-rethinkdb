import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subscription } from 'rxjs/Subscription';
import { Subscriber } from 'rxjs/Subscriber';
import { Observable } from 'rxjs/Observable';
import { Observer } from 'rxjs/Observer';
import * as io from 'socket.io-client';

import {IRethinkDBAPIConfig, IRethinkObject, IRethinkDBQuery, IRethinkResponse, IResponse} from './interfaces';

import 'rxjs/add/observable/of';
import 'rxjs/add/observable/throw';
import 'rxjs/add/observable/fromPromise';

import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/switchMap';

export class AngularRethinkDBObservable<T extends IRethinkObject> extends BehaviorSubject<T[]> {
    
    // api_url
    private API_URL: string;

    // Socket
    private socket: SocketIOClient.Socket;

    constructor(
        private rethinkdbConfig: IRethinkDBAPIConfig,
        private table: string, 
        private query$?: BehaviorSubject<IRethinkDBQuery>
    ) {
        super([]);
        this.API_URL = (!!rethinkdbConfig.host ? rethinkdbConfig.host : '') + (!!rethinkdbConfig.port ? ':' + rethinkdbConfig.port : '');
    }

    /**
     * @description Function to process data received from backend
     * @param predata 
     */
    private socketDataHandler(predata: string) {
        const data: {new_val: T, old_val: T, err?: string} = JSON.parse(predata);

        // Current "state"
        const db = this.value;

        // Clear the current "state"
        if (!data.old_val && !data.new_val && db.length > 0) {
            this.next([])

        } else if (!!data.err) {
            this.error(data.err);
            
        } else { 
            // New data
            if (!data.old_val && !!data.new_val) {
                this.next([data.new_val, ...db]);
            
            // Update data
            } else if (!!data.old_val && !!data.new_val && db.filter(object => object.id === data.new_val.id).length > 0) {
                this.next([
                    ...db.filter(object => object.id !== data.old_val.id),
                    data.new_val
                    ]
                );
            
            // Delete data
            } else if (!!data.old_val && !data.new_val) {
                this.next([
                    ...db.filter(object => object.id !== data.old_val.id)
                ]);
            }
        }
    }

    /**
     * @description Emits join message to room related with changes on db.table
     * @param <Socket> socket
     * @param <IRethinkDBAPIConfig> dbApiConfig
     * @param <Object> query
     * @returns Observable<Socket>
     * @throws Observable error if the request is unauthorized
     */
    private register(socket: SocketIOClient.Socket, dbApiConfig: IRethinkDBAPIConfig, query: Object): Observable<any> {
        return new Observable((o: Observer<string>) => {
            
            // Connect de socket to the host to validate
            socket.emit('register', JSON.stringify([dbApiConfig, query]), (response: string) => {
                const res: {err: string, msj: string} = JSON.parse(response);
                if (res.err) {
                    o.error(res.err);
                } else {
                    o.next(res.msj);
                }
                o.complete();
            });

        });
    }

    /**
     * @description function to push new data
     * 
     * @param <T> newObject
     * @returns <Observable<IRethinkResponse>>
     */
    push(newObject: Object): Observable<IRethinkResponse> {
        if (this.hasError) {
            return Observable.throw(this.thrownError);

        } else if (this.closed) {
            return Observable.throw(new Error('AngularRethinkDB has been closed.'));
            
        }

        return Observable.fromPromise<IResponse<T>>(
            fetch(this.API_URL + '/api/put', {
                method: 'POST',
                body: JSON.stringify({
                    db: this.rethinkdbConfig.database, 
                    table: this.table, 
                    api_key: this.rethinkdbConfig.api_key, 
                    object: newObject
                }),
                headers: new Headers({
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                })
            })
        )
        .switchMap(res => 
            Observable.fromPromise<Object>(res.json())
                .map((json: IRethinkResponse) => json)
        );
    }
    
    /**
     * @description function to remove data
     * 
     * @param <string | indexName: string, indexValue: strin> index
     * @returns <Observable<IRethinkResponse>>
     */
    remove(index: string | {indexName: string, indexValue: string}): Observable<IRethinkResponse> {
        if (this.hasError) {
            return Observable.throw(this.thrownError);

        } else if (this.closed) {
            return Observable.throw(new Error('AngularRethinkDB has been closed.'));
            
        }

        let body = '';
        if (typeof index === 'string') {
            body = JSON.stringify({
                db: this.rethinkdbConfig.database, 
                table: this.table, 
                api_key: this.rethinkdbConfig.api_key, 
                query: {index: 'id', value: index as string}
            });
        } else {
            const query = index as {indexName: string, indexValue: string};
            body = JSON.stringify({
                db: this.rethinkdbConfig.database, 
                table: this.table, api_key: 
                this.rethinkdbConfig.api_key, 
                query: {index: query.indexName, value: index.indexValue}
            });
        }
        
        return Observable.fromPromise<IResponse<T>>(
            fetch(this.API_URL + '/api/delete', {
                method: 'POST',
                body: body,
                headers: new Headers({
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                })
            })
        )
        .switchMap(res => 
            Observable.fromPromise<Object>(res.json())
                .map((json: IRethinkResponse) => json)
        );
    }

    /**
     * @description function to update an object
     * 
     * @param <T> object
     * @param <Object> optional filter 
     * @returns <Observable<IRethinkResponse>>
     */
    update(updatedObj: T, query?: IRethinkDBQuery): Observable<IRethinkResponse> {
        if (this.hasError) {
            return Observable.throw(this.thrownError);

        } else if (this.closed) {
            return Observable.throw(new Error('AngularRethinkDB has been closed.'));
            
        }

        return Observable.fromPromise<IResponse<T>>(
            fetch(this.API_URL + '/api/update', {
                method: 'POST',
                body: JSON.stringify({ 
                    db: this.rethinkdbConfig.database, 
                    table: this.table, 
                    api_key: this.rethinkdbConfig.api_key, 
                    object: updatedObj, 
                    query: query 
                }),
                headers: new Headers({
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                })
            })
        )
        .switchMap(res => 
            Observable.fromPromise<Object>(res.json())
                .map((json: IRethinkResponse) => json)
        );
    }

    /**
     * @description Add functions to the super.subscribe
     * @param subscriber 
     */
    protected _subscribe(subscriber: Subscriber<T[]>): Subscription {
        // Starts
        Observable.of(this.API_URL)
            .map( API_URL => {
                this.socket = io(API_URL);
                this.socket.on(this.table, this.socketDataHandler.bind(this));
                return true;
            })

            // If query$ has next value, will trigger a new query modifying the subscription filter in backend
            .flatMap(() => (!!this.query$ ? this.query$ : Observable.of(undefined)))
                
            // Register the change's listener
            .flatMap(query => this.register(this.socket, this.rethinkdbConfig, {table: this.table, query: query}))

            .subscribe();

        return super._subscribe(subscriber);
    }

    /**
     * @description Close the socket and deregister 
     */
    unsubscribe() {
        this.socket.disconnect();
        super.unsubscribe();
    }
    
}