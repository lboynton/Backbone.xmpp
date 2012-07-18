//    Backbone XMPP PubSub Storage v0.2

//    (c) 2012 Yiorgis Gozadinos.
//    Backbone.xmpp is distributed under the MIT license.
//    http://github.com/ggozad/Backbone.xmpp


// A simple model/collection using **Backbone.xmpp.storage** and supporting XMPP
// notifications. Can be used to base your models upon.
(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['jquery', 'underscore', 'backbone', 'strophe', 'pubsubstorage'], function () {
            return (root.PubSubNode = factory($, _, Backbone, Strophe, PubSubStorage));
        });
    } else {
        // Browser globals
        root.PubSubNode = factory($, _, Backbone, Strophe, PubSubStorage);
    }

}(this, function ($, _, Backbone, Strophe, PubSubStorage) {

    var exports = {};

    // PubSub Item
    exports.PubSubItem = Backbone.Model.extend({

        sync: Backbone.xmppSync

    });

    // PubSub Items collection
    exports.PubSubNode = Backbone.Collection.extend({

        model: exports.PubSubItem,
        node: null,
        sync: Backbone.xmppSync,

        // **initialize** expects the id of the node to be passed in `options`
        // as well as the Strophe connection.
        // If you do not know it ahead you should add the `node` attribute and
        // subscribe to the XMPP events manually.
        initialize: function (models, options) {
            options = options || {};
            if (options.id && options.connection) {
                this.node = new PubSubStorage(options.id, options.connection);
                options.connection.PubSub.on('xmpp:pubsub:item-published:' + options.id, this.onItemPublished, this);
                options.connection.PubSub.on('xmpp:pubsub:item-deleted:' + options.id, this.onItemDeleted, this);
            }
        },

        // **onItemPublished** is a subscriber to the `xmpp:pubsub:item-published` event.
        // When a model has been pushed to the server from a different client, it will be
        // received and added automatically to the collection, triggering an `add` event.
        // If the model already existed it will be updated triggering a `change` event.
        onItemPublished: function (item) {
            var payload = item.entry,
                self = this,
                d = $.Deferred(),
                existing,
                json;

            d.promise().done(function () {
                existing = self.get(item.id),
                json = JSON.parse($(payload).text());
                if (existing) {
                    self.remove(existing, {silent: true});
                    self.add(existing, {at: 0, silent: true});
                    existing.set(json);
                } else {
                    json.id = item.id;
                    self.add(json, {at: 0});
                }
            });

            if (payload) {
                d.resolve();
            } else {
                this.node.connection.PubSub.items(this.node.id, {item_ids: [item.id]})
                    .done(function (res) {
                        payload = $('entry', res);
                        d.resolve();
                    });
            }
        },

        onItemDeleted: function (item) {
            item = this.get(item.id);
            if (item) {
                this.remove(item);
            }
        }

    });

    return exports;

}));
