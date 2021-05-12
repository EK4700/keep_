const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },    
    resetToken: String,
    resetTokenExpiration: Date,
    cart: {
        products: [{
            productId: {
                type: Schema.Types.ObjectId,
                required: true,
                ref: 'Product'
            },
            qty: {
                type: Number,
                required: true
            }
        }]
    },
    balance: {
        type: Number,
        default: 0
    }
});

userSchema.methods.addToCart = function (product) {
    const index = this.cart.products.findIndex(p => p.productId.toString() === product._id.toString());

    //first time we add to the cart 
    let newQty = 1;
    const updatedCartProducts = [...this.cart.products];

    // Already in the cart
    if (index >= 0) {
        newQty = this.cart.products[index].qty + 1;
        updatedCartProducts[index].qty = newQty;
    } else {
        updatedCartProducts.push({
            productId: product._id,
            qty: newQty
        });
    }

    const updatedCart = {
        products: updatedCartProducts
    }

    this.cart = updatedCart;
    return this.save();
}

userSchema.methods.removeFromCart = function (id) {
    const updatedCart = this.cart.products.filter(p => p.productId.toString() !== id.toString());
    this.cart.products = updatedCart;
    return this.save()
}

userSchema.methods.clearCart = function () {
    this.cart = {
        products: []
    }

    return this.save()
}

module.exports = mongoose.model('User', userSchema);
