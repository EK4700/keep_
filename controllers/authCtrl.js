const User = require("../models/User");
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const crypto = require('crypto');

const { validationResult } = require('express-validator/check')

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: process.env.api_key
    }
}));

/**----------------------
 *    Get Login 
 *------------------------**/
exports.getLogin = (req, res, next) => {
    res.render('auth/login', {
        docTitle: 'Login',
        oldInput: {
            email: '',
            password: ''
        }
    })
}

/**----------------------
 * Post Login
 *------------------------**/
exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('auth/login', {
            docTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password
            }
        })
    }

    User.findOne({ email: email }).then(user => {

        if (!user) {
            //will be stored in the session
            return res.render('auth/login', {
                docTitle: 'Login',
                errorMessage: 'Invalid email or password',
                oldInput: {
                    email: email,
                    password: password
                }
            })
        }

        bcrypt.compare(password, user.password).then(result => {
            if (result) {
                req.session.isLoggedIn = true;
                req.session.user = user;
                return req.session.save((err) => {
                    console.log(err);
                    res.redirect('/')
                })
            }
            req.flash('error', 'Invalid email or password');
            res.redirect('/login');
        }).catch(err => {
            console.log(err);
            res.redirect('/login');
        })
    })
}

/**----------------------
 *    Get Signup
 *------------------------**/
exports.getSignup = (req, res, next) => {
    //console.log(req.flash)
    res.render('auth/signup', {
        docTitle: 'Signup',
        errorMessage: req.flash('error'),
        oldInput: {
            email: '',
            password: '',
            password2: ''
        }
    })

}

/**----------------------
 * Post Login
 *------------------------**/
exports.postSignup = (req, res, next) => {

    const email = req.body.email;
    const password = req.body.password;
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.render('auth/signup', {
            docTitle: 'Signup',
            errorMessage: errors.array()[0].msg,
            oldInput: {
                email: email,
                password: password,
                password2: req.body.password2
            }
        })
    }


    bcrypt.hash(password, 12).then(hash => {
        // create the user with the encrypted password 
        const user = new User({ password: hash, email: email, cart: { products: [] } })
        return user.save();
    }).then(result => {
        res.redirect('/login');
        return transporter.sendMail({
            to: email,
            from: process.env.sender_email,
            subject: 'Signup succced !',
            html: '<h1> you successfully signed up</h1>'
        }).catch(err => console.log(err));
    })

}

// Logout 
exports.postLogout = (req, res, next) => {

    // destroy the session 
    req.session.destroy((err) => {
        res.redirect('/');
    })
}

exports.getReset = (req, res, next) => {
    res.render('auth/reset', {
        docTitle: 'Reset Password',
        errorMessage: req.flash('error')
    })

}

exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            return res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({ email: req.body.email }).then(user => {
            if (!user) {
                req.flash('error', 'No account with this email');
            }
            user.resetToken = token;
            user.resetTokenExpiration = Date.now() + 3600000;
            return user.save();
        }).then(result => {
            res.redirect('/')
            transporter.sendMail({

                to: req.body.email,
                from: process.env.sender_email,
                subject: 'Password reset',
                html: `
                <p> You requested a password Reset <p>
                <p>click the link <a href="http://localhost:8080/reset/${token}"> 
                Link</a> 
                to set a new password
                `
            })
        }).catch(e => console.log(e))

    })
}

exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({
            resetToken: token,
            resetTokenExpiration: { $gt: Date.now() }
        })
        .then(user => {
            res.render('auth/new-password', {
                docTitle: 'New Password',
                errorMessage: req.flash('error'),
                userId: user._id.toString(),
                passwordToken: token
            })
        })
        .catch(err => console.log(err));

}

exports.postNewPassword = (req, res, next) => {
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser;
    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: {
            $gt: Date.now()
        },
        _id: userId
    }).then(user => {

        resetUser = user;
        return bcrypt.hash(newPassword, 12);

    }).then(hash => {

        resetUser.password = hash;
        resetUser.resetToken = null;
        resetUser.resetTokenExpiration = undefined;
        return resetUser.save();

    }).then(result => {
        res.redirect('/login');
    }).catch(err => console.log(err));

}