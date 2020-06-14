import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';

admin.initializeApp(functions.config().firebase);

const db = admin.firestore();
const app = express();
const main = express();

const orgsCollection: string = "orgs";
const usersCollection: string = "users";
const votesCollection: string = "votes";

main.use(cors({ origin: true }));
main.use('/api/v1', app);
main.use(bodyParser.json());
main.use(bodyParser.urlencoded({ extended: false }));

app.get('/data/:orgid', async (req, res) => {
    const users = [] as any;
    const votes = [] as any;
    try {
        const querySnapshot = await db.collection(orgsCollection).doc(req.params.orgid).collection(usersCollection).get();
        querySnapshot.forEach((doc: any) => {
            users.push(doc.data());
        });
    } catch (error) {
        console.error("Error getting documents: ", error);
    }

    try {
        const querySnapshot = await db.collection(orgsCollection).doc(req.params.orgid).collection(votesCollection).get();
        querySnapshot.forEach((doc: any) => {
            votes.push(doc.data());
        });
    } catch (error) {
        console.error("Error getting documents: ", error);
    }
    const usersByLocation: any = {};
    const usersByDesignation: any = {};
    const usersByDepartment: any = {};
    const votesByUsers: any = {};

    votes.forEach((vote: any) => {
        vote.sentiment = (vote.Vote > 3) ? 1 : (vote.Vote < 3) ? -1 : 0;
        if (votesByUsers[vote.userId]) {
            votesByUsers[vote.userId].push(vote);
        } else {
            votesByUsers[vote.userId] = [vote];
        }
    });

    users.forEach((user: any) => {
        if (!usersByLocation[user.location]) {
            usersByLocation[user.location] = {
                numOfUsers: 0,
                sentimentScore: 0
            }
        }
        usersByLocation[user.location].numOfUsers += 1;
        usersByLocation[user.location].sentimentScore = votesByUsers[user.User].reduce((total: any, vote: any) => total + vote.sentiment, 0);

        if (!usersByDesignation[user.designation]) {
            usersByDesignation[user.designation] = {
                numOfUsers: 0,
                sentimentScore: 0
            }
        }
        usersByDesignation[user.designation].numOfUsers += 1;
        usersByDesignation[user.designation].sentimentScore = votesByUsers[user.User].reduce((total: any, vote: any) => total + vote.sentiment, 0);

        if (!usersByDepartment[user.department]) {
            usersByDepartment[user.department] = {
                numOfUsers: 0,
                sentimentScore: 0
            }
        }
        usersByDepartment[user.department].numOfUsers += 1;
        usersByDepartment[user.department].sentimentScore = votesByUsers[user.User].reduce((total: any, vote: any) => total + vote.sentiment, 0);
    });
    res.send({
        usersByLocation,
        usersByDesignation,
        usersByDepartment,
        votesByUsers
    });
});

export const webApi = functions.https.onRequest(main);