# angular-rethinkdb
This is an Angular module for RethinkDB NoSQL realtime database using Observables and Socket.io-client, this is based and influenced by AngularFire2 module created by 
__David East__ so, thanks to him. 

This is an work in progress so apologies for the lack of documentation.

## Usage
Here is a simple demo
### Module 1st
In order to use this, you will need to build a backend seervice for RethinkDB, __or__ you might use this one 
https://github.com/mariolenis/rethinkdb-daas
```js
...
import {AngularRethinkDBModule} from 'angular-rethinkdb';

@NgModule({
  declarations: [...],
  imports: [
    ...,
    AngularRethinkDBModule.forRoot({
        api_key: 'AAAA-BBBBB-CCCCC',
        database: 'your-db',
        host: 'http://<your-host>:<port>'
    })
  ],
  providers: [...],
  bootstrap: [AppComponent]
})
export class AppModule { }

```

### Component Then
```js
...
import {AngularRethinkDBService, AngularRethinkDBObservable} from 'angular-rethinkdb';

interface IMyObjectType {
    ...
}

@Component({
    ...
})
export class Component {
    ...
    myTable: AngularRethinkDBObservable<IMyObjectType[]>;

    constructor(private ar: AngularRethinkDBService) {
        
        // Initialize your object from table
        this.myTable = this.ar.list('myTable');

        // Subscribe to your object and listen to data
        this.myTable.subscribe(data => console.log(data));

        // Push data
        let myNewData: IMyObjectType = {...};
        this.myTable.push(myNewData);

        // Delete data by id
        this.myTable.remove('random-id');

        // Delete data by custom index
        this.myTable.remove({ indexName:'custom-id', indexValue: 'id-value' });

        // Modify data
        let myUpdatedData = Object.assign(myNewData, {myProp: 'new value'});

        // Then update at myTable
        this.myTable.update(myUpdatedData)
            .subscribe(
                response => console.log(response),
                error => console.warn(error) // This is triggered if myUpdatedData has no id as property.
            );
    }
}
```
* Any change on ```'myTable'``` will be published on subscribe method.
* __push__, __remove__, __update__ methods returns Observables to track the operation result

## TODO
* [ SECURITY ] Authentication.
* [ DOCUMENTATION ] All.