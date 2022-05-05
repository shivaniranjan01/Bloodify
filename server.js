const  express=require('express');
const  bodyParser=require('body-parser');
const  path=require('path');
let passport = require("passport"),
  LocalStrategy = require("passport-local"),
  User = require("./models/user"),
  Donor = require("./models/donor"),
  Requester = require("./models/requester"),
  ConfirmedDonor = require("./models/ConfirmedDonor"),
  ConfirmedRequest = require("./models/ConfirmedRequest"),
  BloodStock = require("./models/bloodstock"),
  passportLocalMongoose = require("passport-local-mongoose"),
  mongoose = require("mongoose");
//var popup = require('popups');
var alert =require("alert");


const app= express();
mongoose.connect("mongodb://localhost:27017/database_v1",{useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useFindAndModify', false);
app.use(express.urlencoded({ extended: true }));
app.set('views',path.join(__dirname,'views'));
app.set('view engine','ejs');
app.use(express.static(path.join(__dirname,'public')));
app.locals.moment = require("moment");
app.use(require("express-session")({
	secret: "this is my secret",
	resave: false,
	saveUninitialized: false
}));
//passport configuration
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use(bodyParser.urlencoded({extended: true}));
//making user available in all ejs files

app.use(function (req, res, next) {
  res.locals.currentUser = req.user;
  next();
});

function uuidv4() {
	return 'xxxx-5xx'.replace(/[xy]/g, function(c) {
	  var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
	  return v.toString(16);
	});
}
//adding data to the database
// BloodStock.create({
// 	bloodGroup: 'O',
//     rhFactor: 'negative',
//     units : 0
// },function(err,bloodStock){
// 	if(!err){
// 		console.log(bloodStock)
// 	}
// })
//ROUTES
//home
app.get('/',function(request,response){
    response.render('index');
});
app.get("/secret",isLoggedIn,function(req,res){
	res.render('secret');
});

//login
app.get('/login',function(request,response){
    response.render('login');
});
//login logic
//middleware: code that runs before our final route callback
app.post("/login",passport.authenticate("local",{  //to check our login credentials
	successRedirect: "/",
	failureRedirect: "/login"
}),function(req,res){
    
});

//singup
app.get('/signup',function(request,response){
    response.render('signup');
});
//post
app.post("/signup",function(req,res){
	// console.log(req.body.username);
	// console.log(req.body.password);
    // console.log(req.body.gender);
	var isAdmin = false;
	if(req.body.adminCode === "RSS"){
		isAdmin = true;
	}
	User.register(new User({username: req.body.username, email: req.body.email, age: req.body.age, phone: req.body.phone,gender: req.body.gender,isAdmin:isAdmin}),req.body.password,function(err,user){
		if(err){
			console.log("OOPS SOMETHING WENT WRONG!!");
			console.log(err);
			return res.render("signup");
		}
		passport.authenticate("local")(req, res, function(){ //to log in the user
        
			res.redirect("/");
		});
	});
});

//logout
app.get("/logout",function(req,res){
	req.logout();
	res.redirect("/");
});

// donate blood
app.get("/donate", isLoggedIn, function(req,res){
	// console.log(req.user.id)
	// User.findById(req.user.id, function(err,foundUser){
	// 	if(err){
	// 		console.log(err);
	// 	}
	// 	else{
	// 		console.log(foundUser)
	// 		res.render("donate", {user: foundUser});
	// 	}
	// })
	res.render("donate");
	
});
app.post("/donate", function(req,res){
	const uniqueId = uuidv4();
	const newDonor = {
		userId : uniqueId,
		name: req.body.name,
		isDiabetic: req.body.isDiabetic,
		weight: req.body.weight,
		units: req.body.units,
		bloodGroup: req.body.bloodGroup,
		rhFactor: req.body.rhFactor
	}
	// console.log(newDonor)
	Donor.create(newDonor, function(err,donor){
		if(err){
			console.log(err);
		}
		else{
			res.render("address", { id: uniqueId });
		}
	})
})
app.get("/ourDonors", function(req,res){
	ConfirmedDonor.find({}, function(err,allDonors){
		if(err){
			console.log(err);
		}
		else{
			// console.log(allDonors)
			res.render("showDonors",{donors : allDonors});
		}
	})
	
})

// Confirm donor request
app.get("/confirmDonor", function(req,res){
	res.render("confirmDonor", { message: ''});	
})
app.post("/confirmDonor", async function(req,res){
	const donor = await Donor.findOne({userId : req.body.userId});

	if(donor==null)
	{
		res.render('confirmDonor', { message: 'Confirmation Failed'})
	}

	else
	{
		await Donor.findByIdAndDelete(donor._id);
	// console.log(donor);
	const newDonor = {
		userId : donor.userId,
		name: donor.name,
		isDiabetic:donor.isDiabetic,
		weight:donor.weight,
		units:donor.units,
		bloodGroup:donor.bloodGroup,
		rhFactor:donor.rhFactor
	}
	const bloodStock = await BloodStock.findOne({ "bloodGroup": newDonor.bloodGroup, "rhFactor":newDonor.rhFactor});

	if(bloodStock==null)
	{
		const newstock = {
			bloodGroup: newDonor.bloodGroup,
			rhFactor: newDonor.rhFactor,
			units : newDonor.units
		}

		BloodStock.create(newstock, function(err,newstock){
		if(err){
			console.log(err);
		}
		else{
			//
		}
		});
	}
	else
	{
		bloodStock.units = bloodStock.units + newDonor.units;
		// console.log(bloodStock._id);
		BloodStock.findByIdAndUpdate(bloodStock._id, bloodStock, function(err,updatedStock){
			if(err){
				console.log(err);
			}
			else{
				// console.log(updatedStock)
			}
		})
	}
	ConfirmedDonor.create(newDonor, function(err,newDonor){
		if(err){
			console.log(err);
		}
		else{
			res.redirect("/ourDonors");
		}
	});
}
});


app.get("/confirmedRequests", function(req,res){
	ConfirmedRequest.find({}, function(err,allRequests){
		if(err){
			console.log(err);
		}
		else{
			// console.log(allDonors)
			res.render("showConfirmReq", {request: allRequests });
		}
	})
	
});

//route to request for blood
app.get("/request", isLoggedIn, function(req,res){
	BloodStock.find({},function(err,stock){
		if(err){
			console.log(err);
		}
		else{
			// console.log(stock);
			res.render("request", {bloodStock : stock});
		}
	})
	
})
app.post("/request", function(req,res){
	const uniqueId = uuidv4();
	const data = {
		userId : uniqueId,
		name: req.body.name,
		aadhar : req.body.aadhar,
		units: req.body.units,
		bloodGroup: req.body.bloodGroup,
		rhFactor: req.body.rhFactor
	}
	// console.log(data)
	Requester.create(data, function(err,reply){
		if(err){
			console.log(err);
		}
		else{
			res.render("address", { id: uniqueId });
		}
	})
});


// Confirm Request

app.get("/confirmRequest", function(req,res){
	res.render('confirmRequest', { message: ''})	
});
app.post("/confirmRequest", async function(req,res){
	const request = await Requester.findOne({userId : req.body.userId});

	if(request==null)
	{
		res.render('confirmRequest', { message: 'Request Failed'})
	}
		
	else
	{
		const newRequest = {
		userId : request.userId,
		name: request.name,
		aadhar: request.aadhar,
		units: request.units,
		bloodGroup: request.bloodGroup,
		rhFactor: request.rhFactor
	}

	const bloodStock = await BloodStock.findOne({ "bloodGroup": newRequest.bloodGroup, "rhFactor": newRequest.rhFactor});
	
    if(bloodStock!=null && bloodStock.units >= newRequest.units)
	{
		bloodStock.units = bloodStock.units - newRequest.units;
		BloodStock.findByIdAndUpdate(bloodStock._id, bloodStock, function(err,updatedStock){
		if(err){
			console.log(err);
		}
		else{
			// co// console.log(updatedStock)
			}
		})

		await Requester.findByIdAndDelete(request._id);

		
		// // popup.alert({
		// // 	content: 'Request Succeful'
		// // });
		// alert("request successful");
		// //document.write("<div class="alert alert-success" role="alert"> Request accepted! </div>");
		
		ConfirmedRequest.create(newRequest, function(err,newRequest){
		if(err){
			console.log(err);
		}
		else{
			res.redirect("/confirmedRequests");
		}
		});
	}
	else
	{
		res.render('confirmRequest', {message: 'Request Failed'});	
	}
}
});

//writing our own middleware
function isLoggedIn(req,res,next){
	if(req.isAuthenticated()){
		return next();
	}
	 res.redirect("/login");		
}
app.listen(8000,function(){
    console.log("heard on 8000");
});